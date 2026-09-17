import { describe, expect, it } from "vitest";
import { defaultConfig, definitions, describeFields, getDefinition, portsOf } from "./index";

describe("registry", () => {
  it("has unique types", () => {
    const types = definitions.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it.each(definitions.map((d) => [d.type, d] as const))("%s: defaults parse and fields describe", (_, d) => {
    const config = defaultConfig(d);
    expect(d.configSchema.safeParse(config).success).toBe(true);
    expect(describeFields(d.configSchema).map((f) => f.key)).toEqual(Object.keys(config));
  });

  it("derives inputs from {{variables}} in a text template", () => {
    const ports = portsOf("text", { template: "Hi {{name}} from {{ city }} {{name}}" });
    expect(ports?.inputs.map((p) => p.id)).toEqual(["var:name", "var:city"]);
  });

  it("returns no ports for diagram shapes", () => {
    expect(portsOf("diamond", {})).toBeNull();
  });

  it("infers widgets from schema types and metadata", () => {
    const fields = describeFields(getDefinition("llm")!.configSchema);
    expect(fields.find((f) => f.key === "model")).toMatchObject({ kind: "select", label: "Model" });
    expect(fields.find((f) => f.key === "prompt")).toMatchObject({ kind: "textarea", inline: true });
    expect(fields.find((f) => f.key === "temperature")).toMatchObject({ kind: "number", min: 0, max: 1 });
    const shapeFields = describeFields(getDefinition("sticky")!.configSchema);
    expect(shapeFields.find((f) => f.key === "fill")).toMatchObject({ kind: "color" });
  });
});
