"use client";

import { useState } from "react";
import { Check, CloudOff, Loader2, Lock, Pause } from "lucide-react";
import * as Y from "yjs";
import { decodeBase64 } from "@/lib/base64";
import { createFlowDoc, REMOTE_ORIGIN, type FlowDoc } from "@/lib/flow-doc";
import type { CollabStatus } from "@/lib/use-collab";

/**
 * A flow document pre-filled with the server-rendered state, so the canvas
 * paints immediately while the live connection catches up.
 */
export function useInitialFlowDoc(initialState: string | null): FlowDoc {
  const [flow] = useState(() => {
    const flow = createFlowDoc();
    if (initialState) Y.applyUpdate(flow.doc, decodeBase64(initialState), REMOTE_ORIGIN);
    return flow;
  });
  return flow;
}

const display: Record<CollabStatus, { label: string; icon: React.ReactNode }> = {
  connecting: { label: "Connecting…", icon: <Loader2 className="size-3.5 animate-spin" /> },
  live: { label: "Saved", icon: <Check className="size-3.5" /> },
  saving: { label: "Saving…", icon: <Loader2 className="size-3.5 animate-spin" /> },
  offline: { label: "Offline, changes kept", icon: <CloudOff className="size-3.5 text-warn" /> },
  paused: { label: "Paused while you're away", icon: <Pause className="size-3.5" /> },
  denied: { label: "No access", icon: <Lock className="size-3.5 text-danger" /> },
};

export function CollabStatusBadge({ status }: { status: CollabStatus }) {
  const { label, icon } = display[status];
  return (
    <span className="mr-2 flex items-center gap-1.5 text-xs text-muted" role="status" aria-live="polite">
      {icon}
      {label}
    </span>
  );
}
