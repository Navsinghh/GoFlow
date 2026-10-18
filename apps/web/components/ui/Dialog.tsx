"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** "sheet" slides in from the right edge. */
  variant?: "modal" | "sheet";
  children: React.ReactNode;
}

/**
 * Thin wrapper over the native <dialog> element, which already provides the
 * focus trap, Esc to close, inert background and top-layer stacking.
 */
export function Dialog({ open, onClose, title, description, variant = "modal", children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() focuses the first focusable element (the close button);
      // let content opt in to a better starting point.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clicking the backdrop (the dialog element itself, outside its content) closes it.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby="dialog-title"
      className={cn(
        "border border-line bg-panel p-0 text-fg shadow-2xl shadow-black/50 backdrop:bg-bg/70 backdrop:backdrop-blur-sm",
        variant === "modal"
          ? "m-auto w-[min(480px,calc(100vw-32px))] rounded-xl"
          : "my-0 mr-0 ml-auto h-dvh max-h-dvh w-[min(400px,100vw)] rounded-none border-y-0 border-r-0",
      )}
    >
      {open && (
        <div className={cn("flex flex-col", variant === "sheet" && "h-full")}>
          <header className="flex items-start gap-4 border-b border-line p-5">
            <div className="min-w-0 flex-1">
              <h2 id="dialog-title" className="text-base font-semibold">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-muted transition hover:bg-raised hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </header>
          <div className={cn("p-5", variant === "sheet" && "min-h-0 flex-1 overflow-y-auto")}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
