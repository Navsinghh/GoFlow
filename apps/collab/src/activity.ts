import { isTransactionOrigin, type Document } from "@hocuspocus/server";
import type * as Y from "yjs";
import { recordEvent, type Actor, type Db, type FlowEvent, type FlowEventData } from "@flowcraft/db";
import type { CollabClaims } from "./token";

/** Above this many node/edge additions+removals, one transaction is logged as a single summary. */
const BULK_THRESHOLD = 10;
const MAX_MESSAGE_LENGTH = 2000;

interface StoredNode {
  type: string;
  data?: { label?: unknown; name?: unknown };
}

interface StoredEdge {
  source: string;
  target: string;
}

type PendingEvent = { [K in keyof FlowEventData]: { kind: K; data: FlowEventData[K] } }[keyof FlowEventData];

export function actorOf(user: CollabClaims): Actor {
  return { id: user.sub.startsWith("guest:") ? null : user.sub, name: user.name };
}

function nodeSummary(nodeId: string, node: StoredNode | undefined) {
  const raw = node?.data?.label ?? node?.data?.name;
  const label = typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 60) : undefined;
  return { nodeId, type: node?.type ?? "unknown", label };
}

/** Key-level changes a transaction made directly on `map`. */
function keyChanges<T>(transaction: Y.Transaction, map: Y.Map<T>) {
  // Yjs's typings don't relate Y.Map<T> to AbstractType<YEvent<any>>; the lookup is by identity anyway.
  const events = transaction.changedParentTypes.get(map as unknown as Y.AbstractType<Y.YEvent<any>>) ?? [];
  return events.filter((event) => event.target === map).flatMap((event) => [...event.changes.keys]);
}

/** Sends an event to everyone currently in the flow's room. */
export function broadcastEvent(document: Document, event: FlowEvent) {
  document.broadcastStateless(JSON.stringify({ type: "activity", event }));
}

/**
 * Logs who added or removed nodes and edges. Every update from a client is
 * applied in a transaction whose origin is that client's connection, which
 * carries the user from their token, so attribution can't be spoofed by the
 * client. Moves and field edits aren't logged: they'd drown out everything else.
 */
export function watchActivity(db: Db, document: Document, flowId: string) {
  const nodes = document.getMap<StoredNode>("nodes");
  const edges = document.getMap<StoredEdge>("edges");

  document.on("afterTransaction", (transaction: Y.Transaction) => {
    const origin = transaction.origin;
    if (!isTransactionOrigin(origin) || origin.source !== "connection") return;
    const user = origin.connection.context?.user as CollabClaims | undefined;
    if (!user) return;

    const pending: PendingEvent[] = [];
    for (const [key, change] of keyChanges(transaction, nodes)) {
      if (change.action === "add") pending.push({ kind: "node.added", data: nodeSummary(key, nodes.get(key)) });
      if (change.action === "delete") pending.push({ kind: "node.removed", data: nodeSummary(key, change.oldValue) });
    }
    for (const [key, change] of keyChanges(transaction, edges)) {
      const edge: StoredEdge | undefined = change.action === "delete" ? change.oldValue : edges.get(key);
      if (!edge) continue;
      const data = { source: edge.source, target: edge.target };
      if (change.action === "add") pending.push({ kind: "edge.added", data });
      if (change.action === "delete") pending.push({ kind: "edge.removed", data });
    }
    if (pending.length === 0) return;

    const toRecord: PendingEvent[] =
      pending.length > BULK_THRESHOLD
        ? [
            {
              kind: "graph.bulk",
              data: {
                added: pending.filter((e) => e.kind.endsWith(".added")).length,
                removed: pending.filter((e) => e.kind.endsWith(".removed")).length,
              },
            },
          ]
        : pending;

    void (async () => {
      for (const { kind, data } of toRecord) {
        const event = await recordEvent(db, { flowId, actor: actorOf(user), kind, data } as Parameters<typeof recordEvent>[1]);
        broadcastEvent(document, event);
      }
    })().catch((error) => console.error("Failed to record activity", error));
  });
}

/** Validates a chat payload; returns the text to store, or null to ignore it. */
export function parseChat(payload: string, user: CollabClaims): string | null {
  if (user.sub.startsWith("guest:")) return null;
  let message: unknown;
  try {
    message = JSON.parse(payload);
  } catch {
    return null;
  }
  if (typeof message !== "object" || message === null || (message as { type?: unknown }).type !== "chat") return null;
  const text = (message as { text?: unknown }).text;
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  return trimmed && trimmed.length <= MAX_MESSAGE_LENGTH ? trimmed : null;
}
