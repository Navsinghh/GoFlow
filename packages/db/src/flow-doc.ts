import { eq } from "drizzle-orm";
import * as Y from "yjs";
import { flow, type FlowSnapshot } from "./schema";
import type { Db } from "./index";

interface StoredNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
}

interface StoredEdge {
  source: string;
  target: string;
}

/** Plain node/edge JSON from an encoded doc, for list previews and server-side reads. */
export function snapshotOf(state: Uint8Array): FlowSnapshot {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state);
  const nodes = [...doc.getMap<StoredNode>("nodes").values()];
  const edges = [...doc.getMap<StoredEdge>("edges").values()];
  doc.destroy();
  return {
    nodes: nodes.map(({ id, type, position, width, height }) => ({ id, type, position, width, height })),
    edges: edges.map(({ source, target }) => ({ source, target })),
  };
}

export async function loadFlowDoc(db: Db, flowId: string): Promise<Uint8Array | null> {
  const row = await db.query.flow.findFirst({ columns: { doc: true }, where: eq(flow.id, flowId) });
  return row?.doc ?? null;
}

export class InvalidUpdateError extends Error {}

/**
 * Merges a Yjs update into the stored document. Yjs updates commute and are
 * idempotent, so concurrent writers (HTTP saves, the collaboration server)
 * never lose each other's changes; the row lock just keeps two
 * read-merge-write cycles from interleaving.
 */
export async function applyFlowUpdate(db: Db, flowId: string, update: Uint8Array) {
  try {
    Y.decodeUpdate(update);
  } catch {
    throw new InvalidUpdateError("Not a valid Yjs update");
  }

  return db.transaction(async (tx) => {
    const [row] = await tx.select({ doc: flow.doc }).from(flow).where(eq(flow.id, flowId)).for("update");
    if (!row) return null;
    const merged = row.doc ? Y.mergeUpdates([row.doc, update]) : update;
    const snapshot = snapshotOf(merged);
    await tx.update(flow).set({ doc: merged, snapshot }).where(eq(flow.id, flowId));
    return { doc: merged, snapshot };
  });
}
