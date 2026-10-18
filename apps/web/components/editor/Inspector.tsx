"use client";

import { useMemo } from "react";
import { CircleAlert, Trash2 } from "lucide-react";
import { validate, type Issue } from "@flowcraft/flow-engine";
import { describeFields, getDefinition, portsOf, readConfig, resolvePorts, type FieldSpec } from "@flowcraft/node-registry";
import { useFlowState } from "@/lib/flow-context";
import { nodeDisplayName } from "@/lib/node-name";
import { useFocusNodes } from "@/lib/use-focus-nodes";
import { nodeIcon } from "@/lib/icons";

const inputClass =
  "w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

function Field({ field, value, onChange }: { field: FieldSpec; value: unknown; onChange: (v: unknown) => void }) {
  const id = `field-${field.key}`;
  let control: React.ReactNode;
  switch (field.kind) {
    case "textarea":
      control = (
        <textarea
          id={id}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={`${inputClass} field-sizing-content min-h-20 resize-y font-mono text-[13px]`}
        />
      );
      break;
    case "select":
      control = (
        <select id={id} value={String(value)} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {field.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
      break;
    case "number":
      control = (
        <div className="flex items-center gap-3">
          <input
            id={id}
            type="range"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step}
            value={Number(value)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="w-8 text-right font-mono text-xs text-muted">{Number(value)}</span>
        </div>
      );
      break;
    case "boolean":
      control = (
        <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
      );
      break;
    case "color":
      control = (
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-line bg-bg"
          />
          <input
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${field.label} value`}
            className={`${inputClass} font-mono`}
          />
        </div>
      );
      break;
    default:
      control = (
        <input
          id={id}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      );
  }
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {field.label}
      </label>
      {control}
    </div>
  );
}

/** Whether the flow contains workflow nodes, and what's stopping it from running. */
export function useRunCheck() {
  const { nodes, edges } = useFlowState();
  return useMemo(() => {
    const hasWorkflow = nodes.some((n) => getDefinition(n.type ?? "")?.mode === "workflow");
    const { errors } = validate({ nodes: nodes.map((n) => ({ ...n, type: n.type ?? "" })), edges }, resolvePorts);
    return { hasWorkflow, issues: hasWorkflow ? errors : [] };
  }, [nodes, edges]);
}

/**
 * What the inspector has to show right now: the selected node, the problems
 * blocking a workflow, or nothing (in which case it stays out of the way).
 */
export function useInspectorTarget(): "node" | "issues" | null {
  const { nodes } = useFlowState();
  const { issues } = useRunCheck();
  const selected = nodes.filter((n) => n.selected);
  if (selected.length === 1 && getDefinition(selected[0]!.type ?? "")) return "node";
  if (selected.length === 0 && issues.length > 0) return "issues";
  return null;
}

/** Problems that would stop the workflow from running; each one jumps to its node. */
function IssuesPanel({ issues }: { issues: Issue[] }) {
  const { nodes, edges } = useFlowState();
  const focus = useFocusNodes();

  const nodeName = (id: string) => nodeDisplayName(nodes.find((n) => n.id === id));

  // Issues about a connection point at the nodes on either end of it.
  const targetsOf = (issue: Issue) => {
    if (issue.nodeId) return [issue.nodeId];
    const edge = edges.find((e) => e.id === issue.edgeId);
    return edge ? [edge.source, edge.target] : [];
  };

  return (
    <section aria-labelledby="run-check" className="p-4">
      <h2 id="run-check" className="flex items-center gap-2 text-sm font-medium">
        <CircleAlert className="size-4 text-danger" />
        {issues.length === 1 ? "1 thing to fix before running" : `${issues.length} things to fix before running`}
      </h2>
      <ul className="mt-3 space-y-1.5">
        {issues.map((issue, i) => {
          const targets = targetsOf(issue);
          const name = issue.nodeId ? nodeName(issue.nodeId) : null;
          return (
            <li key={i}>
              <button
                type="button"
                disabled={targets.length === 0}
                onClick={() => focus(targets)}
                title={targets.length > 0 ? "Show on canvas" : undefined}
                className="w-full rounded-md bg-danger/10 px-2.5 py-2 text-left text-xs text-fg transition enabled:hover:bg-danger/20"
              >
                {name && <span className="font-medium">{name}: </span>}
                {issue.message}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Settings for the selected node, or the problems blocking a workflow. Renders nothing otherwise. */
export function InspectorContent() {
  const { nodes, updateNodeData, removeNodes, readOnly } = useFlowState();
  const { issues } = useRunCheck();
  const selected = nodes.filter((n) => n.selected);
  const node = selected.length === 1 ? selected[0] : undefined;
  const definition = node?.type ? getDefinition(node.type) : undefined;

  if (!node || !definition) return selected.length === 0 && issues.length > 0 ? <IssuesPanel issues={issues} /> : null;

  const config = readConfig(definition, node.data);
  const ports = portsOf(definition.type, node.data);
  const Icon = nodeIcon(definition.icon);

  return (
    <div>
      <div className="flex items-start gap-3 border-b border-line p-4">
        <span className="grid size-9 place-items-center rounded-md bg-bg text-accent">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium">{definition.label}</h2>
          <p className="text-xs text-muted">{definition.description}</p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => removeNodes([node.id])}
            aria-label="Delete node"
            className="rounded-md p-1.5 text-muted transition hover:bg-danger/15 hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      <fieldset disabled={readOnly} className="space-y-4 p-4 disabled:opacity-70">
        {describeFields(definition.configSchema).map((field) => (
          <Field
            key={field.key}
            field={field}
            value={config[field.key]}
            onChange={(value) => updateNodeData(node.id, { [field.key]: value })}
          />
        ))}
      </fieldset>
      {ports && (
        <div className="border-t border-line p-4">
          <h3 className="mb-2 text-xs font-medium text-muted">Ports</h3>
          <ul className="space-y-1 font-mono text-xs">
            {ports.inputs.map((p) => (
              <li key={p.id}>
                ← {p.label ?? p.id} <span className="text-muted">{p.dataType}{p.required && " · required"}</span>
              </li>
            ))}
            {ports.outputs.map((p) => (
              <li key={p.id}>
                → {p.label ?? p.id} <span className="text-muted">{p.dataType}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Inspector for editors without a sidebar (playground, public links): a card
 * floating over the canvas that only appears when there's something in it.
 */
export function FloatingInspector() {
  const target = useInspectorTarget();
  if (!target) return null;
  return (
    <aside
      data-tour="inspector"
      aria-label="Inspector"
      // Leaves room for the minimap in the bottom-right corner.
      className="absolute top-3 right-3 z-10 max-h-[calc(100%-190px)] w-80 overflow-y-auto rounded-xl border border-line bg-panel/95 shadow-2xl shadow-black/40 backdrop-blur motion-safe:animate-panel-in"
    >
      <InspectorContent />
    </aside>
  );
}
