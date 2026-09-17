"use client";

import { useMemo } from "react";
import { CircleAlert, CircleCheck, Trash2 } from "lucide-react";
import { validate } from "@flowcraft/flow-engine";
import { describeFields, getDefinition, portsOf, readConfig, resolvePorts, type FieldSpec } from "@flowcraft/node-registry";
import { useFlowState } from "@/lib/flow-context";
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

function FlowSummary() {
  const { nodes, edges } = useFlowState();
  const result = useMemo(
    () => validate({ nodes: nodes.map((n) => ({ ...n, type: n.type ?? "" })), edges }, resolvePorts),
    [nodes, edges],
  );
  const stats = [
    ["Nodes", result.numNodes],
    ["Edges", result.numEdges],
    ["DAG", result.isDag ? "yes" : "no"],
  ] as const;

  return (
    <div className="space-y-5 p-4">
      <div>
        <h2 className="text-sm font-medium">Flow</h2>
        <p className="mt-1 text-xs text-muted">Select a node to edit it.</p>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-bg p-2.5">
            <dt className="text-[11px] text-muted">{label}</dt>
            <dd className="mt-0.5 font-mono text-lg">{value}</dd>
          </div>
        ))}
      </dl>
      <section>
        <h3 className="mb-2 text-xs font-medium text-muted">Validation</h3>
        {result.errors.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-ok">
            <CircleCheck className="size-4" /> Ready to run
          </p>
        ) : (
          <ul className="space-y-1.5">
            {result.errors.map((issue, i) => (
              <li key={i} className="flex gap-2 rounded-md bg-danger/10 px-2.5 py-2 text-xs text-fg">
                <CircleAlert className="mt-px size-3.5 shrink-0 text-danger" />
                <span>
                  {issue.message}
                  {issue.nodeId && <span className="ml-1 font-mono text-muted">#{issue.nodeId.slice(0, 4)}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function Inspector() {
  const { nodes, updateNodeData, removeNodes } = useFlowState();
  const selected = nodes.filter((n) => n.selected);
  const node = selected.length === 1 ? selected[0] : undefined;
  const definition = node?.type ? getDefinition(node.type) : undefined;

  if (!node || !definition) {
    return (
      <aside className="w-72 shrink-0 overflow-y-auto border-l border-line bg-panel">
        <FlowSummary />
      </aside>
    );
  }

  const config = readConfig(definition, node.data);
  const ports = portsOf(definition.type, node.data);
  const Icon = nodeIcon(definition.icon);

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-line bg-panel">
      <div className="flex items-start gap-3 border-b border-line p-4">
        <span className="grid size-9 place-items-center rounded-md bg-bg text-accent">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium">{definition.label}</h2>
          <p className="text-xs text-muted">{definition.description}</p>
        </div>
        <button
          type="button"
          onClick={() => removeNodes([node.id])}
          aria-label="Delete node"
          className="rounded-md p-1.5 text-muted transition hover:bg-danger/15 hover:text-danger"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="space-y-4 p-4">
        {describeFields(definition.configSchema).map((field) => (
          <Field
            key={field.key}
            field={field}
            value={config[field.key]}
            onChange={(value) => updateNodeData(node.id, { [field.key]: value })}
          />
        ))}
      </div>
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
    </aside>
  );
}
