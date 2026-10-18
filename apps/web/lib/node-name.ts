import { getDefinition, readConfig } from "@flowcraft/node-registry";

/** "Text “topic”" for a labelled node, or just its kind ("LLM") when it has no label. */
export function nodeDisplayName(node: { type?: string; data: unknown } | undefined): string | null {
  const definition = node?.type ? getDefinition(node.type) : undefined;
  if (!node || !definition) return null;
  const config = readConfig(definition, node.data);
  const label = (config.label ?? config.name) as string | undefined;
  return label?.trim() ? `${definition.label} “${label.trim()}”` : definition.label;
}
