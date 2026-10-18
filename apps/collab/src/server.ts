import type { IncomingMessage } from "node:http";
import { Server, type onAuthenticatePayload } from "@hocuspocus/server";
import * as Y from "yjs";
import { applyFlowUpdate, desc, eq, flowVersion, loadFlowDoc, recordEvent, type Db, type FlowEvent, type FlowSnapshot } from "@flowcraft/db";
import { nanoid } from "nanoid";
import { actorOf, broadcastEvent, parseChat, watchActivity } from "./activity";
import { verifyCollabToken, type CollabClaims } from "./token";

export interface CollabOptions {
  db: Db;
  secret: string;
  port?: number;
  /** Minimum gap between automatic version snapshots. */
  autoVersionEveryMs?: number;
  quiet?: boolean;
}

type Context = { user: CollabClaims };

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/**
 * Hocuspocus server for live editing. Each flow is one Yjs document named by
 * its id. Clients authenticate with a token from the web app; documents load
 * from and save back to Postgres through the same merge used by HTTP saves.
 */
export function createCollabServer({ db, secret, port = 1234, autoVersionEveryMs = 10 * 60_000, quiet = false }: CollabOptions) {
  const lastAutoVersion = new Map<string, number>();

  async function maybeAutoVersion(flowId: string, doc: Uint8Array, snapshot: FlowSnapshot) {
    const now = Date.now();
    let last = lastAutoVersion.get(flowId);
    if (last === undefined) {
      const latest = await db.query.flowVersion.findFirst({
        columns: { createdAt: true },
        where: eq(flowVersion.flowId, flowId),
        orderBy: desc(flowVersion.createdAt),
      });
      last = latest?.createdAt.getTime() ?? 0;
    }
    if (now - last < autoVersionEveryMs || snapshot.nodes.length === 0) {
      lastAutoVersion.set(flowId, last);
      return;
    }
    lastAutoVersion.set(flowId, now);
    await db.insert(flowVersion).values({ id: nanoid(12), flowId, doc, snapshot, label: null });
  }

  const server: Server<Context> = new Server<Context>({
    port,
    quiet,
    stopOnSignals: false,
    // Write to Postgres 2s after the last edit, and at least every 10s while
    // someone keeps editing, instead of once per keystroke.
    debounce: 2000,
    maxDebounce: 10_000,

    async onAuthenticate({ token, documentName, connectionConfig }: onAuthenticatePayload<Context>) {
      const claims = await verifyCollabToken(token, secret).catch(() => {
        throw new Error("Invalid or expired token");
      });
      if (claims.flow !== documentName) throw new Error("Token is for a different flow");
      if (claims.role === "viewer") connectionConfig.readOnly = true;
      return { user: claims };
    },

    async onLoadDocument({ document, documentName }) {
      const state = await loadFlowDoc(db, documentName);
      if (state) Y.applyUpdate(document, state);
      // Attached after loading so the stored state isn't logged as new edits.
      watchActivity(db, document, documentName);
      return document;
    },

    /** Chat: stored with the sender from their token, then relayed to the room. */
    async onStateless({ payload, connection, document, documentName }) {
      const user = (connection.context as Context | undefined)?.user;
      const text = user ? parseChat(payload, user) : null;
      if (!user || !text) return;
      const event = await recordEvent(db, { flowId: documentName, actor: actorOf(user), kind: "message", data: { text } });
      broadcastEvent(document, event);
    },

    /**
     * Internal endpoint for the web app: POST /events with the shared secret
     * pushes an event it recorded (rename, share, …) to everyone in the room.
     */
    async onRequest({ request, response }) {
      // Health check for hosting platforms and the web app's wake-up ping.
      if (request.method === "GET" && request.url === "/health") {
        response
          .writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" })
          .end(JSON.stringify({ ok: true }));
        throw null;
      }
      if (request.method !== "POST" || request.url !== "/events") return;
      if (request.headers.authorization !== `Bearer ${secret}`) {
        response.writeHead(401).end();
        throw null;
      }
      const event = (await readJson(request)) as FlowEvent;
      const document = server.hocuspocus.documents.get(event.flowId);
      if (document) broadcastEvent(document, event);
      response.writeHead(204).end();
      // Rejecting with null tells Hocuspocus the request was handled.
      throw null;
    },

    async onStoreDocument({ document, documentName }) {
      const result = await applyFlowUpdate(db, documentName, Y.encodeStateAsUpdate(document));
      if (result) await maybeAutoVersion(documentName, result.doc, result.snapshot);
    },
  });
  return server;
}
