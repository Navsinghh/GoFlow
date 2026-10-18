"use client";

import { useCallback } from "react";
import {
  Globe,
  History,
  Layers,
  Link2,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Unlink,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { FlowEvent, FlowEventKind } from "@flowcraft/db/schema";
import { getDefinition, readConfig } from "@flowcraft/node-registry";
import { describeEvent } from "@/lib/activity";
import { useFlowState } from "@/lib/flow-context";
import { colorFor } from "@/lib/presence";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/cn";

export type ChangeEvent = Exclude<FlowEvent, { kind: "message" }>;

const icons: Record<Exclude<FlowEventKind, "message">, LucideIcon> = {
  "flow.created": Sparkles,
  "flow.renamed": Pencil,
  "flow.deleted": Trash2,
  "flow.restored": RotateCcw,
  "node.added": Plus,
  "node.removed": Trash2,
  "edge.added": Link2,
  "edge.removed": Unlink,
  "graph.bulk": Layers,
  "share.invited": UserPlus,
  "share.role_changed": UserPlus,
  "share.removed": UserMinus,
  "link.enabled": Globe,
  "link.disabled": Globe,
  "version.saved": History,
  "version.restored": RotateCcw,
};

/** Node ids an event points at, so clicking it can show them on the canvas. */
export function nodesOf(event: ChangeEvent): string[] {
  if (event.kind === "node.added" || event.kind === "node.removed") return [event.data.nodeId];
  if (event.kind === "edge.added" || event.kind === "edge.removed") return [event.data.source, event.data.target];
  return [];
}

/** Current display name of a node in the live document, or null if it's gone. */
export function useNodeNamer() {
  const { flow } = useFlowState();
  return useCallback(
    (nodeId: string) => {
      const node = flow.nodes.get(nodeId);
      const definition = node && getDefinition(node.type);
      if (!node || !definition) return null;
      const config = readConfig(definition, node.data);
      const label = (config.label ?? config.name) as string | undefined;
      return label?.trim() ? `“${label.trim()}”` : definition.label;
    },
    [flow],
  );
}

interface Props {
  event: ChangeEvent;
  meId: string;
  /** Present when the event's nodes still exist; makes the line clickable. */
  onFocus?: () => void;
  /** "compact" is the one-liner used between chat messages. */
  variant?: "full" | "compact";
}

/** One change in the timeline: "You deleted “input” (Input) · 2 minutes ago". */
export function EventLine({ event, meId, onFocus, variant = "full" }: Props) {
  const nameOf = useNodeNamer();
  const Icon = icons[event.kind];
  const compact = variant === "compact";
  const when = (
    <time
      dateTime={event.createdAt.toISOString()}
      title={event.createdAt.toLocaleString()}
      className={cn("text-[11px] text-muted/70", !compact && "mt-0.5 block")}
    >
      {compact ? ` · ${timeAgo(event.createdAt)}` : timeAgo(event.createdAt)}
    </time>
  );
  const body = (
    <>
      <span
        className={cn("grid shrink-0 place-items-center rounded-full bg-bg text-muted", compact ? "size-4" : "mt-0.5 size-5")}
      >
        <Icon className={compact ? "size-2.5" : "size-3"} />
      </span>
      <span className={cn("min-w-0 text-muted", !compact && "flex-1")}>
        <span className="font-medium" style={{ color: colorFor(event.actorId ?? event.actorName) }}>
          {event.actorId === meId ? "You" : event.actorName}
        </span>{" "}
        {describeEvent(event, nameOf)}
        {when}
      </span>
    </>
  );
  const row = cn(
    "flex gap-2 text-left text-xs leading-relaxed",
    compact ? "mx-auto max-w-full items-start rounded-md px-2 py-0.5 text-[11px]" : "w-full rounded-lg px-2 py-1.5",
  );

  return onFocus ? (
    <button type="button" onClick={onFocus} className={cn(row, "transition hover:bg-raised")} title="Show on canvas">
      {body}
    </button>
  ) : (
    <div className={row}>{body}</div>
  );
}
