import { z } from "zod";
import type { NodePorts } from "@flowcraft/flow-engine";

export type NodeMode = "workflow" | "diagram";
export type ShapeKind = "rectangle" | "rounded" | "diamond" | "ellipse" | "sticky" | "label";

export interface FieldUI {
  label: string;
  /** Overrides the widget inferred from the schema type. */
  widget?: "textarea" | "color";
  /** Also render this field inside the node on the canvas. */
  inline?: boolean;
  placeholder?: string;
}

export interface NodeDefinition<S extends z.ZodObject = z.ZodObject> {
  type: string;
  mode: NodeMode;
  category: string;
  label: string;
  description: string;
  /** lucide-react icon name. */
  icon: string;
  configSchema: S;
  /** Executable (workflow) nodes declare their ports; diagram shapes don't. */
  ports?: (config: z.infer<S>) => NodePorts;
  shape?: ShapeKind;
  /** Initial size on the canvas; workflow nodes size to their content. */
  defaultSize?: { width: number; height: number };
}

const fieldUI = new WeakMap<z.ZodType, FieldUI>();

/** Attaches inspector metadata to a schema field. */
export function field<T extends z.ZodType>(schema: T, ui: FieldUI): T {
  fieldUI.set(schema, ui);
  return schema;
}

export function defineNode<S extends z.ZodObject>(definition: NodeDefinition<S>): NodeDefinition<S> {
  return definition;
}

export type FieldSpec = { key: string } & FieldUI &
  (
    | { kind: "text" | "textarea" | "color" | "boolean" }
    | { kind: "number"; min?: number; max?: number; step?: number }
    | { kind: "select"; options: string[] }
  );

function unwrap(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodDefault || schema instanceof z.ZodOptional) {
    return unwrap(schema.unwrap() as z.ZodType);
  }
  return schema;
}

/** Turns a config schema into a list of form fields for the inspector. */
export function describeFields(schema: z.ZodObject): FieldSpec[] {
  return Object.entries(schema.shape).map(([key, raw]) => {
    const fieldSchema = raw as z.ZodType;
    const ui = fieldUI.get(fieldSchema) ?? { label: key };
    const inner = unwrap(fieldSchema);

    if (inner instanceof z.ZodEnum) return { key, ...ui, kind: "select", options: inner.options.map(String) };
    if (inner instanceof z.ZodBoolean) return { key, ...ui, kind: "boolean" };
    if (inner instanceof z.ZodNumber) {
      return {
        key,
        ...ui,
        kind: "number",
        min: inner.minValue ?? undefined,
        max: inner.maxValue ?? undefined,
        step: inner.isInt ? 1 : 0.1,
      };
    }
    return { key, ...ui, kind: ui.widget ?? "text" };
  });
}
