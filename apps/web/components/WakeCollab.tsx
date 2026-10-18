"use client";

import { useEffect } from "react";

/**
 * Pings the collaboration server's health check as soon as the page loads.
 * Free hosts put idle servers to sleep; waking it here means it's usually ready
 * by the time the visitor opens a flow.
 */
export function WakeCollab() {
  useEffect(() => {
    const ws = process.env.NEXT_PUBLIC_COLLAB_URL;
    if (!ws) return;
    const http = ws.replace(/^ws(s?):\/\//, "http$1://").replace(/\/$/, "");
    fetch(`${http}/health`, { mode: "no-cors", keepalive: true }).catch(() => {});
  }, []);
  return null;
}
