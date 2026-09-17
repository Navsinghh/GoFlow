import type { FlowNode, NodePorts, PortResolver } from "@flowcraft/flow-engine";
import type { NodeDefinition, NodeMode } from "./define";
import { inputNode, llmNode, outputNode, textNode } from "./nodes/workflow";
import { diagramNodes } from "./nodes/diagram";

export * from "./define";

export const definitions: NodeDefinition[] = [inputNode, textNode, llmNode, outputNode, ...diagramNodes];

const byType = new Map(definitions.map((d) => [d.type, d]));

export function getDefinition(type: string): NodeDefinition | undefined {
  return byType.get(type);
}

export function definitionsFor(mode: NodeMode): NodeDefinition[] {
  return definitions.filter((d) => d.mode === mode);
}

export function defaultConfig(definition: NodeDefinition): Record<string, unknown> {
  return definition.configSchema.parse({});
}

/** Parses stored node data, falling back to defaults for anything invalid. */
export function readConfig(definition: NodeDefinition, data: unknown): Record<string, unknown> {
  const parsed = definition.configSchema.safeParse(data ?? {});
  if (parsed.success) return parsed.data;
  return { ...defaultConfig(definition), ...(typeof data === "object" ? data : {}) };
}

export function portsOf(type: string, data: unknown): NodePorts | null {
  const definition = byType.get(type);
  if (!definition?.ports) return null;
  return definition.ports(readConfig(definition, data));
}

export const resolvePorts: PortResolver = (node: FlowNode) => portsOf(node.type, node.data);
