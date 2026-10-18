"use client";

import { useEffect, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import type { FlowDoc } from "./flow-doc";
import { PresenceStore, type PresenceUser } from "./presence";

export type CollabStatus = "connecting" | "live" | "saving" | "offline" | "denied";

/** Outgoing edits are batched into one message per window, so typing doesn't send a message per key. */
const FLUSH_DELAY_MS = 300;
/** Only show "Saving…" when a save is actually slow; quick round-trips stay on "Saved". */
const SAVING_INDICATOR_DELAY_MS = 600;

/**
 * Joins the flow's real-time session: syncs the Yjs document with everyone
 * else editing it and shares presence. Edits made while offline are kept in
 * the document and sent when the connection comes back.
 */
export function useCollab(flow: FlowDoc, flowId: string, getToken: () => Promise<string>, user: PresenceUser) {
  const [status, setStatus] = useState<CollabStatus>("connecting");
  const [presence, setPresence] = useState<PresenceStore | null>(null);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  useEffect(() => {
    let connected = false;
    let synced = false;
    let unsynced = 0;
    let denied = false;
    let savingTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      const next: CollabStatus = denied
        ? "denied"
        : !connected
          ? synced
            ? "offline"
            : "connecting"
          : unsynced > 0 || !synced
            ? "saving"
            : "live";
      if (next !== "saving") {
        clearTimeout(savingTimer);
        savingTimer = undefined;
        setStatus(next);
      } else if (!savingTimer) {
        savingTimer = setTimeout(() => setStatus("saving"), SAVING_INDICATOR_DELAY_MS);
      }
    };

    const provider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_COLLAB_URL ?? "ws://localhost:1234",
      name: flowId,
      document: flow.doc,
      token: getToken,
      flushDelay: FLUSH_DELAY_MS,
      onStatus: ({ status }) => {
        connected = status === "connected";
        refresh();
      },
      onSynced: ({ state }) => {
        synced = state;
        refresh();
      },
      onUnsyncedChanges: ({ number }) => {
        unsynced = number;
        refresh();
      },
      onAuthenticationFailed: () => {
        denied = true;
        refresh();
      },
    });

    // Don't let the batching window swallow the last edits when the tab goes away.
    const flushNow = () => provider.flushPendingUpdates();
    const onVisibility = () => document.visibilityState === "hidden" && flushNow();
    window.addEventListener("pagehide", flushNow);
    document.addEventListener("visibilitychange", onVisibility);

    const store = new PresenceStore(provider.awareness!);
    store.setLocal("user", user);
    setPresence(store);
    setProvider(provider);

    return () => {
      clearTimeout(savingTimer);
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", onVisibility);
      flushNow();
      store.destroy();
      provider.destroy();
      setPresence(null);
      setProvider(null);
    };
    // The session is per flow; user details and the token getter don't restart it.
  }, [flow, flowId]);

  return { status, presence, provider };
}
