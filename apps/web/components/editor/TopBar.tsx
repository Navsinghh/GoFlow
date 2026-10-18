"use client";

import { useRef } from "react";
import Link from "next/link";
import { CircleHelp, Download, Eye, Redo2, Undo2, Upload } from "lucide-react";
import type { FlowGraph } from "@flowcraft/flow-engine";
import { readGraph, replaceGraph } from "@/lib/flow-doc";
import { useFlowState } from "@/lib/flow-context";

function isGraph(value: unknown): value is FlowGraph {
  const v = value as FlowGraph;
  return Array.isArray(v?.nodes) && Array.isArray(v?.edges);
}

const iconButton =
  "grid size-8 place-items-center rounded-md text-muted transition hover:bg-raised hover:text-fg disabled:pointer-events-none disabled:opacity-40";

interface TopBarProps {
  title: React.ReactNode;
  /** Used for the export file name. */
  fileName: string;
  homeHref: string;
  actions?: React.ReactNode;
  /** Omitted where the tour doesn't apply (read-only views). */
  onShowTour?: () => void;
}

export function TopBar({ title, fileName, homeHref, actions, onShowTour }: TopBarProps) {
  const { flow, undo, redo, canUndo, canRedo, readOnly } = useFlowState();
  const fileInput = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(readGraph(flow), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `${fileName}.flow.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isGraph(parsed)) throw new Error("Missing nodes or edges");
      replaceGraph(flow, parsed);
    } catch (error) {
      console.error("Import failed", error);
    }
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel px-3">
      <Link href={homeHref} className="font-mono text-sm text-accent">
        flowcraft
      </Link>
      <span className="text-line">/</span>
      {title}
      <div className="ml-auto flex items-center gap-1">
        {actions}
        {readOnly && (
          <span className="mr-2 flex items-center gap-1.5 rounded-md bg-raised px-2 py-1 text-xs text-muted">
            <Eye className="size-3.5" /> View only
          </span>
        )}
        <div data-tour="toolbar" className="flex items-center gap-1">
          {!readOnly && (
            <>
              <button
                type="button"
                data-tour="undo"
                className={iconButton}
                onClick={undo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="size-4" />
              </button>
              <button type="button" className={iconButton} onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
                <Redo2 className="size-4" />
              </button>
              <span className="mx-1 h-5 w-px bg-line" />
              <button type="button" className={iconButton} onClick={() => fileInput.current?.click()} title="Import JSON">
                <Upload className="size-4" />
              </button>
            </>
          )}
          <button type="button" data-tour="export" className={iconButton} onClick={exportJson} title="Export JSON">
            <Download className="size-4" />
          </button>
        </div>
        {onShowTour && (
          <button type="button" data-tour="help" className={iconButton} onClick={onShowTour} title="Show the tour">
            <CircleHelp className="size-4" />
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importJson(file);
            e.target.value = "";
          }}
        />
      </div>
    </header>
  );
}
