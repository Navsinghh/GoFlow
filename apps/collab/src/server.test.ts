import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { createDb, flow, flowEvent, flowVersion, loadFlowDoc, sql, user, workspace, type FlowEvent } from "@flowcraft/db";
import { createCollabServer } from "./server";
import { signCollabToken, type CollabClaims } from "./token";

const db = createDb(process.env.DATABASE_URL!);
const secret = "test-secret-that-is-long-enough-for-hs256";
const server = createCollabServer({ db, secret, port: 0, quiet: true, autoVersionEveryMs: 0 });
let url = "";

const FLOW = "flow-under-test";
const providers: HocuspocusProvider[] = [];

beforeAll(async () => {
  await server.listen();
  url = server.webSocketURL;
});

beforeEach(async () => {
  for (const p of providers.splice(0)) p.destroy();
  await db.execute(sql`truncate "user", workspace, flow cascade`);
  await db.insert(user).values([
    { id: "u1", name: "Ada", email: "ada@example.test" },
    { id: "u2", name: "Bob", email: "bob@example.test" },
  ]);
  await db.insert(workspace).values({ id: "w1", name: "Ada's", personalFor: "u1" });
  await db.insert(flow).values({ id: FLOW, workspaceId: "w1", title: "Test", mode: "workflow" });
});

afterAll(async () => {
  for (const p of providers) p.destroy();
  await server.destroy();
  await db.$client.end();
});

async function connect(claims: Partial<CollabClaims> = {}) {
  const token = await signCollabToken({ sub: "u1", name: "Ada", flow: FLOW, role: "editor", ...claims }, secret);
  const doc = new Y.Doc();
  const received: FlowEvent[] = [];
  return new Promise<{ doc: Y.Doc; provider: HocuspocusProvider; received: FlowEvent[] }>((resolve, reject) => {
    const provider = new HocuspocusProvider({
      url,
      name: FLOW,
      document: doc,
      token,
      onStateless: ({ payload }) => {
        const message = JSON.parse(payload);
        if (message.type === "activity") received.push(message.event);
      },
      onSynced: () => resolve({ doc, provider, received }),
      onAuthenticationFailed: ({ reason }) => reject(new Error(reason)),
    });
    providers.push(provider);
  });
}

/** Resolves once `check` passes, polling briefly. */
async function eventually(check: () => void | Promise<void>, timeout = 3000) {
  const start = Date.now();
  for (;;) {
    try {
      return await check();
    } catch (error) {
      if (Date.now() - start > timeout) throw error;
      await new Promise((r) => setTimeout(r, 25));
    }
  }
}

const node = (id: string) => ({ id, type: "rectangle", position: { x: 0, y: 0 }, data: {} });

describe("collab server", () => {
  it("syncs edits between editors in real time", async () => {
    const a = await connect();
    const b = await connect({ sub: "u2", name: "Bob" });

    a.doc.getMap("nodes").set("n1", node("n1"));

    await eventually(() => expect(b.doc.getMap("nodes").has("n1")).toBe(true));
  });

  it("does not accept edits from viewers", async () => {
    const editor = await connect();
    const viewer = await connect({ sub: "u3", role: "viewer" });

    viewer.doc.getMap("nodes").set("sneaky", node("sneaky"));
    editor.doc.getMap("nodes").set("legit", node("legit"));

    await eventually(() => expect(viewer.doc.getMap("nodes").has("legit")).toBe(true));
    expect(editor.doc.getMap("nodes").has("sneaky")).toBe(false);
  });

  it("rejects tokens for another flow or signed with another secret", async () => {
    await expect(connect({ flow: "some-other-flow" })).rejects.toThrow();

    const forged = await signCollabToken({ sub: "u1", name: "Ada", flow: FLOW, role: "owner" }, "wrong-secret-wrong-secret-wrong!!");
    await expect(
      new Promise((resolve, reject) => {
        providers.push(
          new HocuspocusProvider({ url, name: FLOW, token: forged, onSynced: resolve, onAuthenticationFailed: reject }),
        );
      }),
    ).rejects.toBeTruthy();
  });

  it("loads stored state and persists edits back to Postgres", async () => {
    const a = await connect();
    a.doc.getMap("nodes").set("persisted", node("persisted"));
    await eventually(() => expect(a.provider.unsyncedChanges).toBe(0));

    server.hocuspocus.flushPendingStores();
    await eventually(async () => {
      const stored = new Y.Doc();
      const state = await loadFlowDoc(db, FLOW);
      expect(state).not.toBeNull();
      Y.applyUpdate(stored, state!);
      expect(stored.getMap("nodes").has("persisted")).toBe(true);
    });

    // Auto-versioning (interval 0 in this test) snapshots non-empty flows on save.
    const versions = await db.select().from(flowVersion);
    expect(versions.length).toBeGreaterThan(0);
  });
});

describe("activity", () => {
  const events = () => db.select().from(flowEvent).orderBy(flowEvent.createdAt) as Promise<FlowEvent[]>;

  it("attributes added and removed nodes to the user who made the change", async () => {
    const ada = await connect();
    const bob = await connect({ sub: "u2", name: "Bob" });

    ada.doc.getMap("nodes").set("n1", { ...node("n1"), data: { label: "Start" } });
    await eventually(async () => expect(await events()).toHaveLength(1));
    bob.doc.getMap("nodes").delete("n1");

    await eventually(async () =>
      expect(await events()).toEqual([
        expect.objectContaining({ kind: "node.added", actorId: "u1", actorName: "Ada", data: { nodeId: "n1", type: "rectangle", label: "Start" } }),
        expect.objectContaining({ kind: "node.removed", actorId: "u2", actorName: "Bob" }),
      ]),
    );
    // Everyone in the room is told about each event as it happens.
    await eventually(() => expect(ada.received.map((e) => e.kind)).toEqual(["node.added", "node.removed"]));
  });

  it("summarises one large change instead of listing every node", async () => {
    const ada = await connect();
    ada.doc.transact(() => {
      for (let i = 0; i < 12; i++) ada.doc.getMap("nodes").set(`n${i}`, node(`n${i}`));
    });
    await eventually(async () =>
      expect(await events()).toEqual([expect.objectContaining({ kind: "graph.bulk", data: { added: 12, removed: 0 } })]),
    );
  });

  it("stores chat messages and relays them to the room", async () => {
    const ada = await connect();
    const bob = await connect({ sub: "u2", name: "Bob", role: "viewer" });

    bob.provider.sendStateless(JSON.stringify({ type: "chat", text: "  Can we rename the LLM node?  " }));

    await eventually(() =>
      expect(ada.received).toEqual([
        expect.objectContaining({ kind: "message", actorId: "u2", actorName: "Bob", data: { text: "Can we rename the LLM node?" } }),
      ]),
    );
  });

  it("ignores chat from guests and malformed messages", async () => {
    const guest = await connect({ sub: "guest:abc", name: "Guest", role: "viewer" });
    const ada = await connect();
    guest.provider.sendStateless(JSON.stringify({ type: "chat", text: "hi" }));
    ada.provider.sendStateless("not json");
    ada.provider.sendStateless(JSON.stringify({ type: "chat", text: "x".repeat(2001) }));
    ada.provider.sendStateless(JSON.stringify({ type: "chat", text: "real" }));

    await eventually(async () => expect((await events()).map((e) => e.data)).toEqual([{ text: "real" }]));
  });

  it("relays events from the web app only with the shared secret", async () => {
    const ada = await connect();
    const event = { id: "e1", flowId: FLOW, kind: "flow.renamed", data: { from: "A", to: "B" } };
    const post = (key: string) =>
      fetch(`${server.httpURL}/events`, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: JSON.stringify(event) });

    expect((await post("wrong")).status).toBe(401);
    expect((await post(secret)).status).toBe(204);
    await eventually(() => expect(ada.received).toEqual([expect.objectContaining({ id: "e1", kind: "flow.renamed" })]));
  });
});
