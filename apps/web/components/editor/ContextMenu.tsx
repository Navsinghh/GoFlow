"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface Props {
  /** Screen position the menu opens at (the pointer). */
  x: number;
  y: number;
  /** Small caption above the items, e.g. what was right-clicked. */
  title?: string;
  items: MenuItem[];
  onClose: () => void;
}

const MARGIN = 8;

/** Right-click menu: keyboard navigable, kept on screen, closed by Esc, outside clicks or scrolling. */
export function ContextMenu({ x, y, title, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  // Flip/clamp so the menu never opens off the edge of the window.
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    setPosition({
      x: x + width + MARGIN > window.innerWidth ? Math.max(MARGIN, x - width) : x,
      y: y + height + MARGIN > window.innerHeight ? Math.max(MARGIN, y - height) : y,
    });
    menu.querySelector<HTMLButtonElement>("[role=menuitem]:not(:disabled)")?.focus();
  }, [x, y]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onClose);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const moveFocus = (direction: 1 | -1) => {
    const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)") ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(index + direction + buttons.length) % buttons.length]?.focus();
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={title ?? "Actions"}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") moveFocus(1);
        else if (e.key === "ArrowUp") moveFocus(-1);
        else return;
        e.preventDefault();
      }}
      className="fixed z-50 min-w-52 max-w-72 rounded-lg border border-line bg-panel p-1 shadow-2xl shadow-black/50 motion-safe:animate-panel-in"
      style={{ left: position.x, top: position.y }}
    >
      {title && <p className="truncate px-2.5 pt-1.5 pb-1 text-[11px] text-muted">{title}</p>}
      {items.map(({ label, icon: Icon, onSelect, danger, disabled }) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          disabled={disabled}
          onClick={() => {
            onSelect();
            onClose();
          }}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm outline-none transition disabled:opacity-40",
            danger ? "text-danger hover:bg-danger/15 focus-visible:bg-danger/15" : "hover:bg-raised focus-visible:bg-raised",
          )}
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  );
}
