"use client";

import { useEffect } from "react";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { FlowEvent } from "@flowcraft/db/schema";
import { getDefinition } from "@flowcraft/node-registry";

/** Calls `onEvent` for every activity event the collaboration server pushes. */
export function useLiveActivity(provider: HocuspocusProvider | null, onEvent: (event: FlowEvent) => void) {
  useEffect(() => {
    if (!provider) return;
    const handler = ({ payload }: { payload: string }) => {
      try {
        const message = JSON.parse(payload);
        if (message.type !== "activity") return;
        // Dates arrive as strings over the socket.
        onEvent({ ...message.event, createdAt: new Date(message.event.createdAt) });
      } catch {
        // Not ours; ignore.
      }
    };
    provider.on("stateless", handler);
    return () => void provider.off("stateless", handler);
  }, [provider, onEvent]);
}

export function sendChat(provider: HocuspocusProvider, text: string) {
  provider.sendStateless(JSON.stringify({ type: "chat", text }));
}

/** Looks up a node's display name in the live document (null if it's gone). */
export type NodeNamer = (nodeId: string) => string | null;

function nodePhrase({ type, label }: { type: string; label?: string }) {
  const kind = getDefinition(type)?.label ?? type;
  return label ? `“${label}” (${kind})` : `a new ${kind} node`;
}

/** One-line description of a non-chat event, e.g. "renamed the flow to “Plan”". */
export function describeEvent(event: FlowEvent, nameOf: NodeNamer): string {
  switch (event.kind) {
    case "message":
      return event.data.text;
    case "flow.created":
      return "created this flow";
    case "flow.renamed":
      return `renamed the flow from “${event.data.from}” to “${event.data.to}”`;
    case "flow.deleted":
      return "deleted this flow";
    case "flow.restored":
      return "restored this flow";
    case "node.added":
      return `added ${nodePhrase(event.data)}`;
    case "node.removed":
      return `deleted ${nodePhrase(event.data)}`;
    case "edge.added":
    case "edge.removed": {
      const from = nameOf(event.data.source);
      const to = nameOf(event.data.target);
      const verb = event.kind === "edge.added" ? "connected" : "disconnected";
      return from && to ? `${verb} ${from} → ${to}` : `${verb} two nodes`;
    }
    case "graph.bulk":
      return `made a large change (${event.data.added} added, ${event.data.removed} removed)`;
    case "share.invited":
      return `invited ${event.data.email} as ${event.data.role}`;
    case "share.role_changed":
      return `made ${event.data.email} ${event.data.role === "editor" ? "an editor" : "a viewer"}`;
    case "share.removed":
      return `removed ${event.data.email}'s access`;
    case "link.enabled":
      return "turned on the public link";
    case "link.disabled":
      return "turned off the public link";
    case "version.saved":
      return `saved version “${event.data.label}”`;
    case "version.restored":
      return `restored ${event.data.label === "an auto-save" ? "an auto-save" : `version “${event.data.label}”`}`;
  }
}
