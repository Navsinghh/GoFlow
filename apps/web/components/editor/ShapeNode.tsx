"use client";

import { memo, useState } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { getDefinition, readConfig } from "@flowcraft/node-registry";
import { useFlowActions } from "@/lib/flow-context";
import { cn } from "@/lib/cn";

const sides = [Position.Top, Position.Right, Position.Bottom, Position.Left];

export const ShapeNode = memo(function ShapeNode({ id, type, data, selected }: NodeProps) {
  const definition = getDefinition(type)!;
  const config = readConfig(definition, data) as { label: string; fill: string; stroke: string; textColor: string };
  const shape = definition.shape!;
  const { updateNodeData } = useFlowActions();
  const [editing, setEditing] = useState(false);

  const isDiamond = shape === "diamond";
  const isSticky = shape === "sticky";
  const boxStyle = isDiamond ? undefined : { background: config.fill, borderColor: config.stroke };

  return (
    <div className="group relative size-full" onDoubleClick={() => setEditing(true)}>
      <NodeResizer
        isVisible={selected}
        minWidth={40}
        minHeight={32}
        lineClassName="!border-accent"
        handleClassName="!size-2 !rounded-sm !border-accent !bg-bg"
      />
      {isDiamond && (
        <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon
            points="50,0 100,50 50,100 0,50"
            fill={config.fill}
            stroke={config.stroke}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      <div
        style={boxStyle}
        className={cn(
          "absolute inset-0 flex items-center justify-center p-3 text-center text-sm",
          shape === "rectangle" && "rounded-md border-2",
          shape === "rounded" && "rounded-full border-2",
          shape === "ellipse" && "rounded-[50%] border-2",
          isSticky && "items-start justify-start rounded-sm text-left shadow-lg shadow-black/40",
          shape === "label" && "border-0",
          isDiamond && "px-[22%]",
        )}
      >
        {editing ? (
          <textarea
            autoFocus
            value={config.label}
            onChange={(e) => updateNodeData(id, { label: e.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            aria-label="Shape label"
            style={{ color: config.textColor }}
            className={cn(
              "nodrag nowheel size-full resize-none bg-transparent outline-none",
              isSticky ? "text-left" : "text-center",
            )}
          />
        ) : (
          <span
            style={{ color: config.textColor }}
            className="line-clamp-6 whitespace-pre-wrap break-words"
          >
            {config.label || (selected ? "Double-click to edit" : "")}
          </span>
        )}
      </div>
      {sides.map((side) => (
        <Handle
          key={side}
          id={side}
          type="source"
          position={side}
          className="!size-2.5 !border-2 !border-bg !bg-accent opacity-0 transition group-hover:opacity-100"
        />
      ))}
    </div>
  );
});
