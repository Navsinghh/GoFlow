import { describe, expect, it } from "vitest";
import { extractVariables, interpolate } from "./interpolate";
import { topoSort } from "./topo";
import { validate } from "./validate";
import type { FlowEdge, FlowNode, NodePorts, PortResolver } from "./types";

const node = (id: string, type: string): FlowNode => ({ id, type, position: { x: 0, y: 0 }, data: {} });
const edge = (source: string, target: string, sourceHandle = "out", targetHandle = "in"): FlowEdge => ({
  id: `${source}->${target}`,
  source,
  target,
  sourceHandle,
  targetHandle,
});

const portsByType: Record<string, NodePorts> = {
  start: { inputs: [], outputs: [{ id: "out", dataType: "text" }] },
  step: { inputs: [{ id: "in", dataType: "any" }], outputs: [{ id: "out", dataType: "text" }] },
  image: { inputs: [{ id: "in", dataType: "image", required: true }], outputs: [] },
};
const resolve: PortResolver = (n) => portsByType[n.type] ?? null;

describe("extractVariables", () => {
  it("finds unique names in order, tolerating whitespace", () => {
    expect(extractVariables("{{ a }} and {{b}} and {{a}}")).toEqual(["a", "b"]);
  });
  it("ignores invalid identifiers", () => {
    expect(extractVariables("{{1x}} {{ok_1}} {{a-b}}")).toEqual(["ok_1"]);
  });
});

describe("interpolate", () => {
  it("substitutes known values and keeps unknown placeholders", () => {
    expect(interpolate("Hi {{name}}, {{missing}}", { name: "Ada" })).toBe("Hi Ada, {{missing}}");
  });
  it("serialises non-string values", () => {
    expect(interpolate("{{x}}", { x: { a: 1 } })).toBe('{"a":1}');
  });
});

describe("topoSort", () => {
  it("orders a DAG", () => {
    const { order, cycle } = topoSort(["c", "b", "a"], [edge("a", "b"), edge("b", "c")]);
    expect(cycle).toBeNull();
    expect(order).toEqual(["a", "b", "c"]);
  });
  it("reports cycles", () => {
    const { cycle } = topoSort(["a", "b", "c"], [edge("a", "b"), edge("b", "a"), edge("b", "c")]);
    expect(cycle).toEqual(["a", "b", "c"]);
  });
});

describe("validate", () => {
  it("accepts a valid pipeline and returns execution order", () => {
    const result = validate(
      { nodes: [node("s", "step"), node("i", "start")], edges: [edge("i", "s")] },
      resolve,
    );
    expect(result).toMatchObject({ numNodes: 2, numEdges: 1, isDag: true, errors: [], order: ["i", "s"] });
  });

  it("flags cycles, type mismatches and missing required inputs", () => {
    const result = validate(
      {
        nodes: [node("a", "step"), node("b", "step"), node("img", "image"), node("img2", "image")],
        edges: [edge("a", "b"), edge("b", "a"), edge("a", "img")],
      },
      resolve,
    );
    const codes = result.errors.map((e) => e.code);
    expect(result.isDag).toBe(false);
    expect(codes).toContain("cycle");
    expect(codes).toContain("type-mismatch");
    expect(result.errors).toContainEqual(expect.objectContaining({ code: "missing-input", nodeId: "img2" }));
  });

  it("ignores non-executable nodes and their edges", () => {
    const result = validate(
      { nodes: [node("i", "start"), node("note", "sticky")], edges: [edge("note", "i", "x", "y")] },
      resolve,
    );
    expect(result.errors).toEqual([]);
    expect(result.order).toEqual(["i"]);
  });

  it("reports dangling edges and unknown ports", () => {
    const result = validate(
      { nodes: [node("i", "start"), node("s", "step")], edges: [edge("i", "gone"), edge("i", "s", "out", "nope")] },
      resolve,
    );
    expect(result.errors.map((e) => e.code)).toEqual(["dangling-edge", "unknown-port"]);
  });
});
