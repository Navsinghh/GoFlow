"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { FlowEvent } from "@flowcraft/db/schema";
import { useLiveActivity } from "./activity";
import { useTRPC } from "./trpc/client";

export type TimelineScope = "changes" | "chat";

const inScope = (scope: TimelineScope, event: FlowEvent) => (event.kind === "message") === (scope === "chat");

function byNewest(a: FlowEvent, b: FlowEvent) {
  return b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);
}

/**
 * One slice of a flow's timeline: the latest page from the server, earlier
 * pages on demand, and events pushed live over the collaboration socket,
 * merged and de-duplicated. Returned newest first.
 */
export function useTimeline(flowId: string, provider: HocuspocusProvider | null, scope: TimelineScope) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useQuery(trpc.activity.list.queryOptions({ flowId, scope }));
  const [older, setOlder] = useState<{ events: FlowEvent[]; hasMore: boolean } | null>(null);
  const [live, setLive] = useState<FlowEvent[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);

  useLiveActivity(
    provider,
    useCallback(
      (event: FlowEvent) => {
        if (inScope(scope, event)) setLive((prev) => (prev.some((e) => e.id === event.id) ? prev : [...prev, event]));
      },
      [scope],
    ),
  );

  const events = useMemo(() => {
    const all = new Map<string, FlowEvent>();
    for (const e of [...(older?.events ?? []), ...(data?.events ?? []), ...live]) all.set(e.id, e);
    return [...all.values()].sort(byNewest);
  }, [older, data, live]);

  const loadOlder = async () => {
    const oldest = events.at(-1);
    if (!oldest) return;
    setLoadingOlder(true);
    try {
      const page = await queryClient.fetchQuery(
        trpc.activity.list.queryOptions({ flowId, scope, before: oldest.createdAt }),
      );
      setOlder((prev) => ({ events: [...(prev?.events ?? []), ...page.events], hasMore: page.hasMore }));
    } finally {
      setLoadingOlder(false);
    }
  };

  return {
    events,
    hasMore: older ? older.hasMore : (data?.hasMore ?? false),
    loadOlder,
    loadingOlder,
    isPending,
    isError,
  };
}
