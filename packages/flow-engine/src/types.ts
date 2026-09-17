/** Data carried along an edge. `any` connects to everything. */
export type DataType = "any" | "text" | "json" | "file" | "image";

export interface Port {
  id: string;
  label?: string;
  dataType: DataType;
  required?: boolean;
}

export interface NodePorts {
  inputs: Port[];
  outputs: Port[];
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  width?: number;
  height?: number;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/**
 * Resolves the ports of a node. Returns `null` for nodes that don't take part
 * in execution (e.g. diagram shapes), which validation then ignores.
 */
export type PortResolver = (node: FlowNode) => NodePorts | null;
