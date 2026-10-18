"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

const DISMISSED_KEY = "flowcraft:v2-banner-dismissed";

/** Dismissible "AI runs are coming in v2" note for signed-in pages. */
export function V2Banner() {
  // Hidden until we know it wasn't dismissed, so it never flashes.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(DISMISSED_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
      <p className="flex-1 text-fg">
        <span className="font-medium">Flowcraft v2 is on its way.</span>{" "}
        <span className="text-muted">
          Soon your workflows will actually run, with free built-in AI, agents that use tools, and an AI teammate on the
          canvas. Design them now and they'll be ready.
        </span>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded-md p-0.5 text-muted transition hover:bg-raised hover:text-fg"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
