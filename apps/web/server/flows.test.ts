import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as Y from "yjs";
import { createDb, flowEvent, sql, user } from "@flowcraft/db";
import { createFlowDoc, LOCAL_ORIGIN } from "@/lib/flow-doc";
import { applyFlowUpdate, loadFlowDoc } from "./flows";
import type { FlowEvent } from "@flowcraft/db";
import type { Mailer, SessionUser } from "./trpc/init";
import { createCaller } from "./trpc/router";

const db = createDb(process.env.DATABASE_URL!);

const sent: { to: string; flowTitle: string; url: string }[] = [];
const mailer: Mailer = { sendInvite: async (to, invite) => void sent.push({ to, ...invite }) };
const published: FlowEvent[] = [];
const as = (u: SessionUser | null) =>
  createCaller({ db, user: u, mailer, appUrl: "https://flowcraft.test", publish: (e) => void published.push(e) });

const alice = { id: "alice", name: "Alice", email: "alice@example.test" };
const bob = { id: "bob", name: "", email: "bob@example.test" };
const carol = { id: "carol", name: "Carol", email: "carol@example.test" };
const asAlice = as(alice);
const asBob = as(bob);
const asCarol = as(carol);

beforeEach(async () => {
  sent.length = 0;
  published.length = 0;
  await db.execute(sql`truncate "user", workspace, flow cascade`);
  await db.insert(user).values([alice, bob, carol]);
});

afterAll(() => db.$client.end());

describe("flow router", () => {
  it("creates flows in a personal workspace and lists newest first", async () => {
    const first = await asAlice.flow.create({ mode: "workflow" });
    const second = await asAlice.flow.create({ mode: "diagram", title: "Onboarding" });

    const list = await asAlice.flow.list();
    expect(list.map((f) => f.id)).toEqual([second.id, first.id]);
    expect(list[1]).toMatchObject({ title: "Untitled workflow", role: "owner", shared: false });
  });

  it("renames, duplicates, deletes and restores", async () => {
    const { id } = await asAlice.flow.create({ mode: "workflow", title: "Pipeline" });
    await asAlice.flow.rename({ id, title: "  Summariser  " });
    const copy = await asAlice.flow.duplicate({ id });
    await asAlice.flow.delete({ id });

    expect((await asAlice.flow.list()).map((f) => f.title)).toEqual(["Summariser (copy)"]);
    await expect(asAlice.flow.get({ id })).rejects.toThrow("Flow not found");

    await asAlice.flow.restore({ id });
    expect(await asAlice.flow.get({ id })).toMatchObject({ title: "Summariser" });
    expect(copy.id).not.toBe(id);
  });

  it("hides other users' flows", async () => {
    const { id } = await asAlice.flow.create({ mode: "workflow" });
    expect(await asBob.flow.list()).toEqual([]);
    await expect(asBob.flow.get({ id })).rejects.toThrow("Flow not found");
    await expect(asBob.flow.rename({ id, title: "mine now" })).rejects.toThrow("Flow not found");
    await expect(asBob.flow.delete({ id })).rejects.toThrow("Flow not found");
  });

  it("rejects anonymous callers", async () => {
    await expect(as(null).flow.list()).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("sharing", () => {
  it("gives invited people the role they were invited with", async () => {
    const { id } = await asAlice.flow.create({ mode: "workflow", title: "Roadmap" });
    await asAlice.share.invite({ flowId: id, email: " Bob@Example.test ", role: "viewer" });
    await asAlice.share.invite({ flowId: id, email: carol.email, role: "editor" });

    expect(sent.map((m) => m.to)).toEqual(["bob@example.test", "carol@example.test"]);
    expect(sent[0]).toMatchObject({ flowTitle: "Roadmap", url: `https://flowcraft.test/flow/${id}` });

    expect(await asBob.flow.list()).toEqual([expect.objectContaining({ id, role: "viewer", shared: true })]);
    await expect(asBob.flow.rename({ id, title: "nope" })).rejects.toThrow("Flow not found");

    await asCarol.flow.rename({ id, title: "Roadmap v2" });
    await expect(asCarol.flow.delete({ id })).rejects.toThrow("Flow not found");
    await expect(asCarol.share.list({ flowId: id })).rejects.toThrow("Flow not found");
  });

  it("works for people who sign up after being invited", async () => {
    const { id } = await asAlice.flow.create({ mode: "diagram" });
    await asAlice.share.invite({ flowId: id, email: "dave@example.test", role: "editor" });

    await db.insert(user).values({ id: "dave", name: "Dave", email: "dave@example.test" });
    const asDave = as({ id: "dave", name: "Dave", email: "dave@example.test" });
    expect(await asDave.flow.get({ id })).toMatchObject({ role: "editor", shared: true });
  });

  it("lets the owner change roles and revoke access", async () => {
    const { id } = await asAlice.flow.create({ mode: "workflow" });
    await asAlice.share.invite({ flowId: id, email: bob.email, role: "viewer" });
    await asAlice.share.invite({ flowId: id, email: bob.email, role: "editor" });
    expect((await asAlice.share.list({ flowId: id })).people).toEqual([
      expect.objectContaining({ email: bob.email, role: "editor" }),
    ]);

    await asAlice.share.remove({ flowId: id, email: bob.email });
    expect(await asBob.flow.list()).toEqual([]);
  });

  it("rejects inviting yourself", async () => {
    const { id } = await asAlice.flow.create({ mode: "workflow" });
    await expect(asAlice.share.invite({ flowId: id, email: alice.email, role: "editor" })).rejects.toThrow(
      "You already own this flow",
    );
  });

  it("toggles a public link", async () => {
    const { id } = await asAlice.flow.create({ mode: "workflow" });
    const { publicToken } = await asAlice.share.setPublic({ flowId: id, enabled: true });
    expect(publicToken).toHaveLength(24);
    expect((await asAlice.share.list({ flowId: id })).publicToken).toBe(publicToken);
    expect((await asAlice.share.setPublic({ flowId: id, enabled: false })).publicToken).toBeNull();
  });

  it("lets viewers duplicate a shared flow into their own workspace", async () => {
    const { id } = await asAlice.flow.create({ mode: "workflow", title: "Template" });
    await asAlice.share.invite({ flowId: id, email: bob.email, role: "viewer" });
    const copy = await asBob.flow.duplicate({ id });
    expect(await asBob.flow.get({ id: copy.id })).toMatchObject({ title: "Template (copy)", role: "owner", shared: false });
  });
});

describe("versions", () => {
  it("saves named versions and returns their state", async () => {
    const { id } = await asAlice.flow.create({ mode: "diagram" });
    await expect(asAlice.version.create({ flowId: id, label: "Empty" })).rejects.toThrow("Nothing to save yet");

    const tab = createFlowDoc();
    tab.nodes.set("a", { id: "a", type: "rectangle", position: { x: 0, y: 0 }, data: {} });
    await applyFlowUpdate(db, id, Y.encodeStateAsUpdate(tab.doc));

    const { id: versionId } = await asAlice.version.create({ flowId: id, label: "First draft" });
    const [listed] = await asAlice.version.list({ flowId: id });
    expect(listed).toMatchObject({ id: versionId, label: "First draft", author: "Alice" });
    expect(listed!.snapshot.nodes.map((n) => n.id)).toEqual(["a"]);

    const { state } = await asAlice.version.get({ flowId: id, versionId });
    const restored = createFlowDoc();
    Y.applyUpdate(restored.doc, Buffer.from(state, "base64"));
    expect([...restored.nodes.keys()]).toEqual(["a"]);

    await expect(asBob.version.list({ flowId: id })).rejects.toThrow("Flow not found");
  });
});

describe("activity", () => {
  const kinds = async (flowId: string) => (await asAlice.activity.list({ flowId })).events.map((e) => e.kind);

  it("records who did what, newest first, and publishes each event", async () => {
    const { id } = await asAlice.flow.create({ mode: "workflow", title: "Plan" });
    await asAlice.share.invite({ flowId: id, email: bob.email, role: "editor" });
    await asBob.flow.rename({ id, title: "Plan v2" });
    await asBob.flow.rename({ id, title: "Plan v2" }); // no-op renames aren't logged
    await asAlice.share.invite({ flowId: id, email: bob.email, role: "viewer", notify: false });
    await asAlice.share.setPublic({ flowId: id, enabled: true });

    const { events } = await asAlice.activity.list({ flowId: id });
    expect(events.map((e) => [e.kind, e.actorName])).toEqual([
      ["link.enabled", "Alice"],
      ["share.role_changed", "Alice"],
      ["flow.renamed", "bob@example.test"],
      ["share.invited", "Alice"],
      ["flow.created", "Alice"],
    ]);
    expect(events[2]).toMatchObject({ data: { from: "Plan", to: "Plan v2" }, actorId: "bob" });
    expect(published.map((e) => e.id).sort()).toEqual(events.map((e) => e.id).sort());
  });

  it("logs deletes, restores and versions", async () => {
    const { id } = await asAlice.flow.create({ mode: "diagram" });
    const tab = createFlowDoc();
    tab.nodes.set("a", { id: "a", type: "rectangle", position: { x: 0, y: 0 }, data: {} });
    await applyFlowUpdate(db, id, Y.encodeStateAsUpdate(tab.doc));
    const { id: versionId } = await asAlice.version.create({ flowId: id, label: "Draft" });
    await asAlice.version.markRestored({ flowId: id, versionId });
    await asAlice.flow.delete({ id });
    await asAlice.flow.restore({ id });

    expect(await kinds(id)).toEqual(["flow.restored", "flow.deleted", "version.restored", "version.saved", "flow.created"]);
  });

  it("pages chat and changes separately", async () => {
    const { id } = await asAlice.flow.create({ mode: "workflow" });
    await db.insert(flowEvent).values({ id: "m1", flowId: id, actorId: "bob", actorName: "Bob", kind: "message", data: { text: "hi" } });
    const changes = await asAlice.activity.list({ flowId: id, scope: "changes" });
    const chat = await asAlice.activity.list({ flowId: id, scope: "chat" });
    expect(changes.events.map((e) => e.kind)).toEqual(["flow.created"]);
    expect(chat.events.map((e) => e.data)).toEqual([{ text: "hi" }]);
  });

  it("is visible to anyone with access, and only to them", async () => {
    const { id } = await asAlice.flow.create({ mode: "workflow" });
    await expect(asBob.activity.list({ flowId: id })).rejects.toThrow("Flow not found");
    await asAlice.share.invite({ flowId: id, email: bob.email, role: "viewer" });
    expect((await asBob.activity.list({ flowId: id })).events).toHaveLength(2);
  });
});

describe("applyFlowUpdate", () => {
  const position = { x: 0, y: 0 };

  it("merges concurrent edits from separate documents", async () => {
    const { id } = await asAlice.flow.create({ mode: "diagram" });
    const tabA = createFlowDoc();
    const tabB = createFlowDoc();
    tabA.nodes.set("a", { id: "a", type: "rectangle", position, data: {} });
    tabB.nodes.set("b", { id: "b", type: "diamond", position, data: {} });

    await Promise.all([
      applyFlowUpdate(db, id, Y.encodeStateAsUpdate(tabA.doc)),
      applyFlowUpdate(db, id, Y.encodeStateAsUpdate(tabB.doc)),
    ]);

    const stored = createFlowDoc();
    Y.applyUpdate(stored.doc, (await loadFlowDoc(db, id))!);
    expect([...stored.nodes.keys()].sort()).toEqual(["a", "b"]);

    const [listed] = await asAlice.flow.list();
    expect(listed!.snapshot.nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
  });

  it("applies incremental updates on top of the stored state", async () => {
    const { id } = await asAlice.flow.create({ mode: "diagram" });
    const tab = createFlowDoc();
    const updates: Uint8Array[] = [];
    tab.doc.on("update", (u: Uint8Array) => updates.push(u));

    tab.doc.transact(() => tab.nodes.set("a", { id: "a", type: "rectangle", position, data: {} }), LOCAL_ORIGIN);
    tab.doc.transact(() => tab.nodes.delete("a"), LOCAL_ORIGIN);
    tab.doc.transact(() => tab.nodes.set("c", { id: "c", type: "ellipse", position, data: {} }), LOCAL_ORIGIN);
    for (const u of updates) await applyFlowUpdate(db, id, u);

    const snapshot = (await asAlice.flow.list())[0]!.snapshot;
    expect(snapshot.nodes.map((n) => n.id)).toEqual(["c"]);
  });

  it("rejects bytes that aren't a Yjs update", async () => {
    const { id } = await asAlice.flow.create({ mode: "diagram" });
    await expect(applyFlowUpdate(db, id, new Uint8Array([1, 2, 3, 4, 5]))).rejects.toThrow("Not a valid Yjs update");
  });
});
