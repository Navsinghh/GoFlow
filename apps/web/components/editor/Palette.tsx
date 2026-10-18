"use client";

import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { Search, Shapes, Sparkles, Workflow } from "lucide-react";
import { definitionsFor, getDefinition, type NodeDefinition, type NodeMode } from "@flowcraft/node-registry";
import { useFlowActions } from "@/lib/flow-context";
import { nodeIcon } from "@/lib/icons";
import { cn } from "@/lib/cn";

export const DRAG_MIME = "application/flowcraft-node";

const tabs: { mode: NodeMode; label: string; icon: typeof Workflow }[] = [
  { mode: "diagram", label: "Diagram", icon: Shapes },
  { mode: "workflow", label: "Workflow", icon: Workflow },
];

function groupByCategory(definitions: NodeDefinition[]) {
  const groups = new Map<string, NodeDefinition[]>();
  for (const d of definitions) groups.set(d.category, [...(groups.get(d.category) ?? []), d]);
  return [...groups];
}

export function Palette({ initialMode }: { initialMode: NodeMode }) {
  const [mode, setMode] = useState<NodeMode>(initialMode);
  const [query, setQuery] = useState("");
  const { addNode } = useFlowActions();
  const { screenToFlowPosition, getNodes } = useReactFlow();

  const q = query.trim().toLowerCase();
  const visible = definitionsFor(mode).filter(
    (d) => !q || d.label.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
  );

  // Click (or Enter) adds the node to the middle of the visible canvas,
  // cascading down-right so repeated clicks don't stack nodes exactly.
  const addToCenter = (type: string) => {
    const canvas = document.querySelector(".react-flow")?.getBoundingClientRect();
    if (!canvas) return;
    const center = screenToFlowPosition({ x: canvas.left + canvas.width / 2, y: canvas.top + canvas.height / 2 });
    // addNode centres sized shapes on the point, so compare top-left corners.
    const size = getDefinition(type)?.defaultSize ?? { width: 0, height: 0 };
    const taken = getNodes().map((n) => n.position);
    let { x, y } = center;
    const near = (p: { x: number; y: number }) =>
      Math.abs(p.x - (x - size.width / 2)) < 30 && Math.abs(p.y - (y - size.height / 2)) < 30;
    while (taken.some(near)) {
      x += 40;
      y += 40;
    }
    addNode(type, { x, y });
  };

  return (
    <aside data-tour="palette" className="flex w-64 shrink-0 flex-col border-r border-line bg-panel">
      <div className="grid grid-cols-2 gap-1 p-2" role="tablist" aria-label="Node library">
        {tabs.map(({ mode: m, label, icon: Icon }) => (
          <button
            key={m}
            role="tab"
            data-tour={`tab-${m}`}
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm transition",
              mode === m ? "bg-raised text-fg" : "text-muted hover:text-fg",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>
      <label className="mx-2 flex items-center gap-2 rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm focus-within:border-accent">
        <Search className="size-4 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search nodes"
          className="w-full bg-transparent outline-none placeholder:text-muted"
        />
      </label>
      <div className="flex-1 space-y-4 overflow-y-auto p-2 pt-4">
        {mode === "workflow" && (
          <p className="flex gap-2 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-2 text-xs leading-relaxed text-muted">
            <Sparkles className="mt-px size-3.5 shrink-0 text-accent" />
            <span>
              <span className="font-medium text-fg">Running workflows arrives in v2.</span> Design yours now and they'll
              be ready to run.
            </span>
          </p>
        )}
        {groupByCategory(visible).map(([category, items]) => (
          <section key={category}>
            <h3 className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">{category}</h3>
            <div className="space-y-1">
              {items.map((d) => {
                const Icon = nodeIcon(d.icon);
                return (
                  <button
                    key={d.type}
                    data-tour={`node-${d.type}`}
                    data-label={d.label}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DRAG_MIME, d.type);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => addToCenter(d.type)}
                    title={d.description}
                    className="flex w-full cursor-grab items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left transition hover:border-line hover:bg-raised active:cursor-grabbing"
                  >
                    <span className="grid size-8 place-items-center rounded-md bg-bg text-accent">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm">{d.label}</span>
                      <span className="block truncate text-xs text-muted">{d.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {visible.length === 0 && <p className="px-1 text-sm text-muted">No nodes match “{query}”.</p>}
      </div>
      <p className="border-t border-line p-3 text-xs text-muted">Drag onto the canvas, or click to add.</p>
    </aside>
  );
}
