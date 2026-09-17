import type { FlowEdge } from "./types";

export interface TopoResult {
  /** Node ids in execution order (only complete when `cycle` is null). */
  order: string[];
  /** Ids of nodes that sit on or behind a cycle, or null for a DAG. */
  cycle: string[] | null;
}

/** Kahn's algorithm. Edges pointing at unknown ids are ignored. */
export function topoSort(nodeIds: string[], edges: FlowEdge[]): TopoResult {
  const known = new Set(nodeIds);
  const indegree = new Map(nodeIds.map((id) => [id, 0]));
  const next = new Map<string, string[]>(nodeIds.map((id) => [id, []]));

  for (const edge of edges) {
    if (!known.has(edge.source) || !known.has(edge.target)) continue;
    next.get(edge.source)!.push(edge.target);
    indegree.set(edge.target, indegree.get(edge.target)! + 1);
  }

  const queue = nodeIds.filter((id) => indegree.get(id) === 0);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const target of next.get(id)!) {
      const remaining = indegree.get(target)! - 1;
      indegree.set(target, remaining);
      if (remaining === 0) queue.push(target);
    }
  }

  const cycle = order.length === nodeIds.length ? null : nodeIds.filter((id) => indegree.get(id)! > 0);
  return { order, cycle };
}
