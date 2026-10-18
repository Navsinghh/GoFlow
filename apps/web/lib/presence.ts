"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { XYPosition } from "@xyflow/react";

type Awareness = NonNullable<HocuspocusProvider["awareness"]>;

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
}

export interface Peer {
  clientId: number;
  user: PresenceUser;
  /** Pointer position in flow coordinates, or null when off-canvas. */
  cursor: XYPosition | null;
  selection: string[];
}

const palette = ["#f472b6", "#a78bfa", "#2dd4bf", "#f2b33d", "#60a5fa", "#fb7185", "#4ade80", "#fb923c"];

/** A stable colour per user, so people keep their colour across sessions. */
export function colorFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length]!;
}

const EMPTY: Peer[] = [];

/**
 * React-friendly view of Yjs awareness (who's here, where their pointer is,
 * what they've selected). Snapshots are cached so `useSyncExternalStore`
 * only re-renders a component when the slice it reads actually changed.
 */
export class PresenceStore {
  private peers: Peer[] = EMPTY;
  private byNode = new Map<string, Peer[]>();
  private listeners = new Set<() => void>();

  constructor(private readonly awareness: Awareness) {
    awareness.on("change", this.update);
    this.update();
  }

  private update = () => {
    const peers: Peer[] = [];
    for (const [clientId, state] of this.awareness.getStates()) {
      if (clientId === this.awareness.clientID || !state.user) continue;
      peers.push({ clientId, user: state.user, cursor: state.cursor ?? null, selection: state.selection ?? [] });
    }
    this.peers = peers;

    // Rebuild per-node selections, keeping the old array when nothing changed.
    const next = new Map<string, Peer[]>();
    for (const peer of peers) {
      for (const nodeId of peer.selection) next.set(nodeId, [...(next.get(nodeId) ?? []), peer]);
    }
    for (const [nodeId, list] of next) {
      const prev = this.byNode.get(nodeId);
      if (prev && prev.length === list.length && prev.every((p, i) => p.clientId === list[i]!.clientId)) {
        next.set(nodeId, prev);
      }
    }
    this.byNode = next;
    for (const listener of this.listeners) listener();
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getPeers = () => this.peers;

  peersSelecting = (nodeId: string) => this.byNode.get(nodeId) ?? EMPTY;

  setLocal<K extends "user" | "cursor" | "selection">(key: K, value: K extends "user" ? PresenceUser : K extends "cursor" ? XYPosition | null : string[]) {
    this.awareness.setLocalStateField(key, value);
  }

  destroy() {
    this.awareness.off("change", this.update);
    this.listeners.clear();
  }
}

const PresenceContext = createContext<PresenceStore | null>(null);
export const PresenceProvider = PresenceContext.Provider;

export function usePresence() {
  return useContext(PresenceContext);
}

const noopSubscribe = () => () => {};

export function usePeers(): Peer[] {
  const store = usePresence();
  return useSyncExternalStore(store?.subscribe ?? noopSubscribe, store?.getPeers ?? (() => EMPTY), () => EMPTY);
}

/** Other people who currently have this node selected. */
export function useNodePeers(nodeId: string): Peer[] {
  const store = usePresence();
  return useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    () => store?.peersSelecting(nodeId) ?? EMPTY,
    () => EMPTY,
  );
}
