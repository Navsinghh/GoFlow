"use client";

import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import type { NodeMode } from "@flowcraft/node-registry";
import { useFlow, type FlowDoc } from "@/lib/flow-doc";
import { FlowProvider } from "@/lib/flow-context";
import { PresenceProvider, type PresenceStore } from "@/lib/presence";
import { Canvas } from "./Canvas";
import { FloatingInspector } from "./Inspector";
import { Palette } from "./Palette";
import { TopBar } from "./TopBar";
import { Tour } from "@/components/tour/Tour";
import { editorTour } from "@/components/tour/editor-tour";

const TOUR_SEEN_KEY = "flowcraft:editor-tour:v1";

// Storage can be unavailable (private mode, blocked site data); the tour then
// just shows again next time.
function tourSeen() {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markTourSeen() {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, "1");
  } catch {}
}

function isEditable(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

interface EditorProps {
  flow: FlowDoc;
  title: React.ReactNode;
  fileName: string;
  homeHref: string;
  initialMode?: NodeMode;
  actions?: React.ReactNode;
  readOnly?: boolean;
  /** Live collaborators, when the flow is connected to a real-time session. */
  presence?: PresenceStore | null;
  /** A permanent right sidebar (e.g. chat). Without one, the inspector floats over the canvas when needed. */
  sidePanel?: React.ReactNode;
}

export function Editor({
  flow,
  title,
  fileName,
  homeHref,
  initialMode = "diagram",
  actions,
  readOnly = false,
  presence = null,
  sidePanel,
}: EditorProps) {
  const api = useFlow(flow, { readOnly });
  const { undo, redo } = api;
  const [tourOpen, setTourOpen] = useState(false);

  // First visit: open the tour once the canvas has had a moment to lay out.
  // Viewers can't edit, so the tour (which is about editing) doesn't apply.
  useEffect(() => {
    if (readOnly || tourSeen()) return;
    const timer = setTimeout(() => setTourOpen(true), 600);
    return () => clearTimeout(timer);
  }, [readOnly]);

  const closeTour = () => {
    setTourOpen(false);
    markTourSeen();
  };

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
        <PresenceProvider value={presence}>
          <div className="flex h-dvh flex-col">
            <TopBar
              title={title}
              fileName={fileName}
              homeHref={homeHref}
              actions={actions}
              onShowTour={readOnly ? undefined : () => setTourOpen(true)}
            />
            <div className="flex min-h-0 flex-1">
              {!readOnly && <Palette initialMode={initialMode} />}
              <main data-tour="canvas" className="relative min-w-0 flex-1">
                <Canvas />
                {!sidePanel && <FloatingInspector />}
              </main>
              {sidePanel}
            </div>
          </div>
          <Tour steps={editorTour} open={tourOpen} onClose={closeTour} />
        </PresenceProvider>
      </FlowProvider>
    </ReactFlowProvider>
  );
}
