"use client";

import { memo, useLayoutEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import type { DataType, Port } from "@flowcraft/flow-engine";
import { describeFields, getDefinition, readConfig, type FieldSpec } from "@flowcraft/node-registry";
import { useFlowActions } from "@/lib/flow-context";
import { nodeIcon } from "@/lib/icons";
import { cn } from "@/lib/cn";

const portColor: Record<DataType, string> = {
  any: "var(--color-port-any)",
  text: "var(--color-port-text)",
  json: "var(--color-port-json)",
  file: "var(--color-port-file)",
  image: "var(--color-port-image)",
};

function PortRow({ port, side }: { port: Port; side: "in" | "out" }) {
  return (
    <div className={cn("relative flex items-center gap-2 px-3 py-1 text-xs", side === "out" && "justify-end")}>
      <Handle
        id={port.id}
        type={side === "in" ? "target" : "source"}
        position={side === "in" ? Position.Left : Position.Right}
        className="!size-3 !border-2 !border-panel"
        style={{ background: portColor[port.dataType] }}
      />
      <span className="text-fg/90">{port.label ?? port.id}</span>
      <span className="font-mono text-[10px] text-muted">{port.dataType}</span>
    </div>
  );
}

function InlineField({ nodeId, field, value }: { nodeId: string; field: FieldSpec; value: unknown }) {
  const { updateNodeData } = useFlowActions();
  const common = {
    value: String(value ?? ""),
    placeholder: field.placeholder,
    "aria-label": field.label,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      updateNodeData(nodeId, { [field.key]: e.target.value }),
    className:
      "nodrag nowheel w-full rounded-md border border-line bg-bg px-2.5 py-2 font-mono text-[13px] text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20",
  };
  return field.kind === "textarea" ? (
    <textarea {...common} rows={2} className={cn(common.className, "field-sizing-content min-h-14 resize-none")} />
  ) : (
    <input {...common} />
  );
}

export const WorkflowNode = memo(function WorkflowNode({ id, type, data, selected }: NodeProps) {
  const definition = getDefinition(type)!;
  const config = readConfig(definition, data);
  const ports = definition.ports!(config);
  const inlineFields = describeFields(definition.configSchema).filter((f) => f.inline);
  const { removeNodes } = useFlowActions();
  const Icon = nodeIcon(definition.icon);

  // Variable ports come and go as the user types; React Flow must re-measure them.
  const updateNodeInternals = useUpdateNodeInternals();
  const handleKey = [...ports.inputs, ...ports.outputs].map((p) => p.id).join("|");
  useLayoutEffect(() => updateNodeInternals(id), [id, handleKey, updateNodeInternals]);

  return (
    <div
      className={cn(
        "group w-[280px] rounded-xl border bg-panel/95 shadow-xl shadow-black/30 backdrop-blur transition-colors",
        selected ? "border-accent ring-2 ring-accent/25" : "border-line",
      )}
    >
      <div className="flex items-center gap-2 rounded-t-xl border-b border-line bg-raised/60 px-3 py-2">
        <Icon className="size-4 text-accent" />
        <span className="text-sm font-medium">{definition.label}</span>
        <span className="ml-auto font-mono text-[10px] text-muted">{id.slice(0, 4)}</span>
        <button
          type="button"
          onClick={() => removeNodes([id])}
          aria-label={`Delete ${definition.label} node`}
          className="nodrag rounded p-0.5 text-muted opacity-0 transition hover:bg-danger/20 hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {inlineFields.length > 0 && (
        <div className="space-y-2 p-3">
          {inlineFields.map((field) => (
            <InlineField key={field.key} nodeId={id} field={field} value={config[field.key]} />
          ))}
        </div>
      )}

      {(ports.inputs.length > 0 || ports.outputs.length > 0) && (
        <div className="border-t border-line py-1.5">
          {ports.inputs.map((port) => (
            <PortRow key={port.id} port={port} side="in" />
          ))}
          {ports.outputs.map((port) => (
            <PortRow key={port.id} port={port} side="out" />
          ))}
        </div>
      )}
    </div>
  );
});
