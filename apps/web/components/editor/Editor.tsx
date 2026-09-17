"use client";

import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useFlow, type FlowDoc } from "@/lib/flow-doc";
import { FlowProvider } from "@/lib/flow-context";
import { Canvas } from "./Canvas";
import { Inspector } from "./Inspector";
import { Palette } from "./Palette";
import { TopBar } from "./TopBar";

function isEditable(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export function Editor({ flow, title }: { flow: FlowDoc; title: string }) {
  const api = useFlow(flow);
  const { undo, redo } = api;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Leave native undo to text fields.
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z" || isEditable(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  return (
    <ReactFlowProvider>
      <FlowProvider api={api}>
        <div className="flex h-dvh flex-col">
          <TopBar title={title} />
          <div className="flex min-h-0 flex-1">
            <Palette />
            <main className="relative min-w-0 flex-1">
              <Canvas />
            </main>
            <Inspector />
          </div>
        </div>
      </FlowProvider>
    </ReactFlowProvider>
  );
}
