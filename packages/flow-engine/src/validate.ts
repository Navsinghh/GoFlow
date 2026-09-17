import { topoSort } from "./topo";
import type { DataType, FlowGraph, NodePorts, PortResolver } from "./types";

export type IssueCode =
  | "unknown-node"
  | "dangling-edge"
  | "unknown-port"
  | "type-mismatch"
  | "self-loop"
  | "cycle"
  | "missing-input";

export interface Issue {
  code: IssueCode;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationResult {
  numNodes: number;
  numEdges: number;
  isDag: boolean;
  errors: Issue[];
  /** Execution order of the executable nodes (empty when not a DAG). */
  order: string[];
}

export function isCompatible(from: DataType, to: DataType): boolean {
  return from === "any" || to === "any" || from === to;
}

/**
 * Validates the executable part of a graph. Nodes the resolver returns `null`
 * for (diagram shapes) and edges touching them are skipped, so annotations can
 * live on the same canvas as a workflow.
 */
export function validate(graph: FlowGraph, resolvePorts: PortResolver): ValidationResult {
  const errors: Issue[] = [];
  const ports = new Map<string, NodePorts>();
  const allIds = new Set(graph.nodes.map((n) => n.id));

  for (const node of graph.nodes) {
    const resolved = resolvePorts(node);
    if (resolved) ports.set(node.id, resolved);
  }

  const edges = graph.edges.filter((e) => {
    if (!allIds.has(e.source) || !allIds.has(e.target)) {
      errors.push({ code: "dangling-edge", edgeId: e.id, message: "Edge points at a node that no longer exists" });
      return false;
    }
    return ports.has(e.source) && ports.has(e.target);
  });

  for (const edge of edges) {
    if (edge.source === edge.target) {
      errors.push({ code: "self-loop", edgeId: edge.id, nodeId: edge.source, message: "A node can't connect to itself" });
      continue;
    }
    const out = ports.get(edge.source)!.outputs.find((p) => p.id === edge.sourceHandle);
    const inp = ports.get(edge.target)!.inputs.find((p) => p.id === edge.targetHandle);
    if (!out || !inp) {
      errors.push({ code: "unknown-port", edgeId: edge.id, message: "Edge is attached to a port that doesn't exist" });
    } else if (!isCompatible(out.dataType, inp.dataType)) {
      errors.push({
        code: "type-mismatch",
        edgeId: edge.id,
        nodeId: edge.target,
        message: `Can't send ${out.dataType} into ${inp.label ?? inp.id} (expects ${inp.dataType})`,
      });
    }
  }

  for (const [nodeId, { inputs }] of ports) {
    for (const input of inputs) {
      if (!input.required) continue;
      const connected = edges.some((e) => e.target === nodeId && e.targetHandle === input.id);
      if (!connected) {
        errors.push({ code: "missing-input", nodeId, message: `Input "${input.label ?? input.id}" isn't connected` });
      }
    }
  }

  const { order, cycle } = topoSort([...ports.keys()], edges);
  for (const nodeId of cycle ?? []) {
    errors.push({ code: "cycle", nodeId, message: "Node is part of, or depends on, a cycle" });
  }

  return {
    numNodes: graph.nodes.length,
    numEdges: graph.edges.length,
    isDag: cycle === null,
    errors,
    order: cycle ? [] : order,
  };
}
