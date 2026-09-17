import type { Connection, Edge } from "@xyflow/react";
import { isCompatible, type NodePorts } from "@flowcraft/flow-engine";
import { getDefinition, portsOf } from "@flowcraft/node-registry";

interface NodeLike {
  id: string;
  type?: string;
  data: unknown;
}

/**
 * The canvas runs in loose connection mode so diagram shapes can connect from
 * any side. For workflow nodes this puts the connection in output → input order
 * and checks it against the registry's port types, returning null if it's not
 * allowed.
 */
export function normalizeConnection(
  connection: Connection | Edge,
  nodes: NodeLike[],
  edges: Edge[],
): Connection | null {
  const { source, target, sourceHandle = null, targetHandle = null } = connection;
  if (source === target) return null;

  const a = nodes.find((n) => n.id === source);
  const b = nodes.find((n) => n.id === target);
  if (!a?.type || !b?.type) return null;

  const modeA = getDefinition(a.type)?.mode;
  const modeB = getDefinition(b.type)?.mode;
  if (modeA !== modeB) return null;
  if (modeA === "diagram") return { source, target, sourceHandle, targetHandle };

  const portsA = portsOf(a.type, a.data);
  const portsB = portsOf(b.type, b.data);
  if (!portsA || !portsB) return null;

  const forward = orient(portsA, sourceHandle, portsB, targetHandle);
  const result = forward
    ? { source, target, sourceHandle, targetHandle }
    : orient(portsB, targetHandle, portsA, sourceHandle)
      ? { source: target, target: source, sourceHandle: targetHandle, targetHandle: sourceHandle }
      : null;
  if (!result) return null;

  // An input accepts a single connection.
  const taken = edges.some((e) => e.target === result.target && e.targetHandle === result.targetHandle);
  return taken ? null : result;
}

function orient(from: NodePorts, fromHandle: string | null, to: NodePorts, toHandle: string | null) {
  const out = from.outputs.find((p) => p.id === fromHandle);
  const inp = to.inputs.find((p) => p.id === toHandle);
  return Boolean(out && inp && isCompatible(out.dataType, inp.dataType));
}
