"use client";

import { useRef } from "react";
import Link from "next/link";
import { Download, Redo2, Undo2, Upload } from "lucide-react";
import type { FlowGraph } from "@flowcraft/flow-engine";
import { readGraph, replaceGraph } from "@/lib/flow-doc";
import { useFlowState } from "@/lib/flow-context";

function isGraph(value: unknown): value is FlowGraph {
  const v = value as FlowGraph;
  return Array.isArray(v?.nodes) && Array.isArray(v?.edges);
}

const iconButton =
  "grid size-8 place-items-center rounded-md text-muted transition hover:bg-raised hover:text-fg disabled:pointer-events-none disabled:opacity-40";

export function TopBar({ title }: { title: string }) {
  const { flow, undo, redo, canUndo, canRedo } = useFlowState();
  const fileInput = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(readGraph(flow), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `${title.toLowerCase()}.flow.json` });
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
      <Link href="/" className="font-mono text-sm text-accent">
        flowcraft
      </Link>
      <span className="text-line">/</span>
      <h1 className="text-sm font-medium">{title}</h1>
      <div className="ml-auto flex items-center gap-1">
        <button type="button" className={iconButton} onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 className="size-4" />
        </button>
        <button type="button" className={iconButton} onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="size-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-line" />
        <button type="button" className={iconButton} onClick={() => fileInput.current?.click()} title="Import JSON">
          <Upload className="size-4" />
        </button>
        <button type="button" className={iconButton} onClick={exportJson} title="Export JSON">
          <Download className="size-4" />
        </button>
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
