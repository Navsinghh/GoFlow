import type { FlowGraph } from "@flowcraft/flow-engine";
import { defaultConfig, getDefinition } from "@flowcraft/node-registry";

function node(id: string, type: string, x: number, y: number, data: Record<string, unknown> = {}) {
  const definition = getDefinition(type)!;
  return { id, type, position: { x, y }, data: { ...defaultConfig(definition), ...data }, ...definition.defaultSize };
}

const edge = (source: string, sourceHandle: string, target: string, targetHandle: string) => ({
  id: `${source}-${target}`,
  source,
  sourceHandle,
  target,
  targetHandle,
});

/** Starter flow shown on an empty canvas: one workflow and one small diagram. */
export const seedGraph: FlowGraph = {
  nodes: [
    node("topic", "start", 0, 40, { name: "topic" }),
    node("prompt", "text", 360, 0, { template: "Write a four-line poem about {{topic}}." }),
    node("writer", "llm", 720, -20, { system: "You are a concise poet." }),
    node("poem", "end", 1080, 40, { name: "poem" }),
    node("note", "sticky", 0, 260, {
      label: "Type {{anything}} in a Text or LLM node and a new input port appears.",
    }),
    node("idea", "rounded", 360, 420, { label: "New idea" }),
    node("check", "diamond", 610, 382, { label: "Worth it?" }),
    node("build", "rectangle", 860, 410, { label: "Build it" }),
  ],
  edges: [
    edge("topic", "value", "prompt", "var:topic"),
    edge("prompt", "text", "writer", "var:context"),
    edge("writer", "response", "poem", "value"),
    edge("idea", "right", "check", "left"),
    edge("check", "right", "build", "left"),
  ],
};
