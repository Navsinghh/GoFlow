"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, MoreHorizontal, Pencil, Shapes, Trash2, Workflow } from "lucide-react";
import { FlowPreview } from "@/components/FlowPreview";
import { timeAgo } from "@/lib/time";
import type { FlowSummary } from "./Dashboard";

interface Props {
  flow: FlowSummary;
  onRename: (title: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function FlowCard({ flow, onRename, onDuplicate, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canRename = flow.role !== "viewer";
  const canDelete = flow.role === "owner";
  const ModeIcon = flow.mode === "workflow" ? Workflow : Shapes;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  const commitRename = (value: string) => {
    setRenaming(false);
    const title = value.trim();
    if (title && title !== flow.title) onRename(title);
  };

  const menuItem =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-raised hover:text-fg";

  return (
    <li className="group relative overflow-hidden rounded-xl border border-line bg-panel transition hover:border-accent/60">
      <Link href={`/flow/${flow.id}`} className="block aspect-[16/9] border-b border-line bg-canvas p-3">
        <FlowPreview snapshot={flow.snapshot} />
        <span className="sr-only">Open {flow.title}</span>
      </Link>
      <div className="flex items-center gap-2 p-3">
        <ModeIcon className="size-4 shrink-0 text-accent" aria-label={flow.mode} />
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              autoFocus
              defaultValue={flow.title}
              aria-label="Flow title"
              maxLength={120}
              onBlur={(e) => commitRename(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(e.currentTarget.value);
                if (e.key === "Escape") setRenaming(false);
              }}
              className="w-full rounded border border-accent bg-bg px-1.5 py-0.5 text-sm outline-none"
            />
          ) : (
            <Link href={`/flow/${flow.id}`} className="block truncate text-sm font-medium hover:underline">
              {flow.title}
            </Link>
          )}
          <p className="text-xs text-muted">
            {flow.shared && <span className="text-accent">{flow.role === "viewer" ? "Can view" : "Can edit"} · </span>}
            Edited {timeAgo(new Date(flow.updatedAt))} · {flow.snapshot.nodes.length} nodes
          </p>
        </div>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={`Actions for ${flow.title}`}
            aria-expanded={menuOpen}
            className="grid size-8 place-items-center rounded-md text-muted transition hover:bg-raised hover:text-fg"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 bottom-full z-20 mb-1 w-40 rounded-lg border border-line bg-panel p-1 shadow-xl shadow-black/40">
              {canRename && (
                <button role="menuitem" type="button" className={menuItem} onClick={() => (setMenuOpen(false), setRenaming(true))}>
                  <Pencil className="size-4" /> Rename
                </button>
              )}
              <button role="menuitem" type="button" className={menuItem} onClick={() => (setMenuOpen(false), onDuplicate())}>
                <Copy className="size-4" /> {flow.shared ? "Make a copy" : "Duplicate"}
              </button>
              {canDelete && (
                <button
                  role="menuitem"
                  type="button"
                  className={`${menuItem} hover:bg-danger/15 hover:text-danger`}
                  onClick={() => (setMenuOpen(false), onDelete())}
                >
                  <Trash2 className="size-4" /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
