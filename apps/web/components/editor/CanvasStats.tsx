"use client";

import { Panel } from "@xyflow/react";
import { useFlowState } from "@/lib/flow-context";
import { useRunCheck } from "./Inspector";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Quiet status pill at the bottom of the canvas: size of the flow (or the selection) and, for workflows, whether it can run. */
export function CanvasStats() {
  const { nodes, edges } = useFlowState();
  const { hasWorkflow, issues } = useRunCheck();
  if (nodes.length === 0) return null;
  const selected = nodes.filter((n) => n.selected).length;

  return (
    <Panel position="bottom-center" className="pointer-events-none">
      <p className="rounded-full border border-line bg-panel/90 px-3 py-1 text-xs text-muted shadow-lg shadow-black/30 backdrop-blur">
        {selected > 1
          ? `${selected} of ${plural(nodes.length, "node")} selected`
          : `${plural(nodes.length, "node")} · ${plural(edges.length, "connection")}`}
        {hasWorkflow &&
          (issues.length === 0 ? (
            <span className="text-ok"> · ✓ Ready to run</span>
          ) : (
            <span className="text-danger"> · {plural(issues.length, "issue")}</span>
          ))}
      </p>
    </Panel>
  );
}
