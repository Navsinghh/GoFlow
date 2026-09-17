import { z } from "zod";
import { extractVariables, type Port } from "@flowcraft/flow-engine";
import { defineNode, field } from "../define";

/** One required input port per `{{variable}}` found in the given templates. */
function variablePorts(...templates: string[]): Port[] {
  return extractVariables(templates.join("\n")).map((name) => ({
    id: `var:${name}`,
    label: name,
    dataType: "any",
    required: true,
  }));
}

export const inputNode = defineNode({
  type: "start",
  mode: "workflow",
  category: "Inputs & outputs",
  label: "Input",
  description: "A value supplied when the workflow runs",
  icon: "LogIn",
  configSchema: z.object({
    name: field(z.string().default("input"), { label: "Name", inline: true }),
    inputType: field(z.enum(["text", "file"]).default("text"), { label: "Type" }),
  }),
  ports: (c) => ({ inputs: [], outputs: [{ id: "value", label: c.name, dataType: c.inputType }] }),
});

export const textNode = defineNode({
  type: "text",
  mode: "workflow",
  category: "Transform",
  label: "Text",
  description: "A template; each {{variable}} becomes an input",
  icon: "Type",
  configSchema: z.object({
    template: field(z.string().default(""), {
      label: "Template",
      widget: "textarea",
      inline: true,
      placeholder: "Hello {{name}}",
    }),
  }),
  ports: (c) => ({ inputs: variablePorts(c.template), outputs: [{ id: "text", dataType: "text" }] }),
});

export const llmNode = defineNode({
  type: "llm",
  mode: "workflow",
  category: "AI",
  label: "LLM",
  description: "Generate text with Claude",
  icon: "Sparkles",
  configSchema: z.object({
    model: field(z.enum(["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"]).default("claude-sonnet-5-5"), {
      label: "Model",
    }),
    system: field(z.string().default(""), { label: "System prompt", widget: "textarea" }),
    prompt: field(z.string().default("{{context}}"), {
      label: "Prompt",
      widget: "textarea",
      inline: true,
      placeholder: "Summarise {{context}}",
    }),
    temperature: field(z.number().min(0).max(1).default(0.7), { label: "Temperature" }),
  }),
  ports: (c) => ({
    inputs: variablePorts(c.system, c.prompt),
    outputs: [{ id: "response", label: "response", dataType: "text" }],
  }),
});

export const outputNode = defineNode({
  type: "end",
  mode: "workflow",
  category: "Inputs & outputs",
  label: "Output",
  description: "A result returned by the workflow",
  icon: "LogOut",
  configSchema: z.object({
    name: field(z.string().default("output"), { label: "Name", inline: true }),
    outputType: field(z.enum(["text", "image"]).default("text"), { label: "Type" }),
  }),
  ports: (c) => ({ inputs: [{ id: "value", label: c.name, dataType: c.outputType, required: true }], outputs: [] }),
});
