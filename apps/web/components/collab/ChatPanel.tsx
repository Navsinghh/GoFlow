"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { MessagesSquare, Send } from "lucide-react";
import type { FlowEvent } from "@flowcraft/db/schema";
import { sendChat } from "@/lib/activity";
import { useFlowState } from "@/lib/flow-context";
import { colorFor } from "@/lib/presence";
import { useFocusNodes } from "@/lib/use-focus-nodes";
import { timeAgo } from "@/lib/time";
import type { useTimeline } from "@/lib/use-timeline";
import { cn } from "@/lib/cn";
import { EventLine, nodesOf, type ChangeEvent } from "./EventLine";

/** Runs of more changes than this in a row collapse behind "+N more changes". */
const MAX_VISIBLE_RUN = 3;

type Item = { type: "message"; event: Extract<FlowEvent, { kind: "message" }> } | { type: "changes"; events: ChangeEvent[] };

interface Props {
  timeline: ReturnType<typeof useTimeline>;
  /** The change log, shown as small lines between messages for context. */
  changes: ReturnType<typeof useTimeline>;
  provider: HocuspocusProvider | null;
  meId: string;
  /** Sending needs a live connection; history still shows without one. */
  canSend: boolean;
}

/**
 * Messages, oldest at the top and the newest just above the composer, with
 * the changes made in between shown as small lines, so a conversation reads
 * alongside what people were doing.
 */
export function ChatPanel({ timeline, changes, provider, meId, canSend }: Props) {
  const { events, hasMore, loadOlder, loadingOlder, isPending } = timeline;
  const { flow } = useFlowState();
  const focus = useFocusNodes();
  const [draft, setDraft] = useState("");
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  const items = useMemo(() => {
    // Only show changes from the period the loaded messages cover, so older
    // pages of chat don't arrive with gaps in the changes between them.
    const oldestMessage = events.at(-1);
    const since = hasMore && oldestMessage ? oldestMessage.createdAt.getTime() : -Infinity;
    const merged = [...events, ...changes.events.filter((e) => e.createdAt.getTime() >= since)].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
    );
    const result: Item[] = [];
    for (const event of merged) {
      if (event.kind === "message") result.push({ type: "message", event });
      else {
        const last = result.at(-1);
        if (last?.type === "changes") last.events.push(event);
        else result.push({ type: "changes", events: [event] });
      }
    }
    return result;
  }, [events, changes.events, hasMore]);
  const messageCount = events.length;

  // Follow new messages, unless the user has scrolled up to read history.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && atBottom.current) list.scrollTop = list.scrollHeight;
  }, [items.length, isPending]);

  const send = () => {
    const text = draft.trim();
    if (!text || !provider || !canSend) return;
    sendChat(provider, text);
    setDraft("");
    atBottom.current = true;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2"
        role="log"
        aria-label="Chat messages"
      >
        {hasMore && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                atBottom.current = false;
                void loadOlder();
              }}
              disabled={loadingOlder}
              className="rounded-md px-2 py-1 text-xs text-accent hover:bg-raised disabled:opacity-60"
            >
              {loadingOlder ? "Loading…" : "Earlier messages"}
            </button>
          </div>
        )}
        {!isPending && messageCount === 0 && items.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center text-xs text-muted">
            <MessagesSquare className="size-5" />
            Talk about this flow with everyone who has access. Changes people make show up here too.
          </div>
        )}
        {items.map((item, i) => {
          if (item.type === "changes") {
            const key = item.events[0]!.id;
            const expanded = expandedRuns.has(key) || item.events.length <= MAX_VISIBLE_RUN;
            // Most recent changes are the most relevant to the next message.
            const shown = expanded ? item.events : item.events.slice(-(MAX_VISIBLE_RUN - 1));
            return (
              <div key={key} className="flex flex-col items-center gap-0.5 py-0.5">
                {!expanded && (
                  <button
                    type="button"
                    onClick={() => setExpandedRuns((prev) => new Set(prev).add(key))}
                    className="rounded-md px-2 py-0.5 text-[11px] text-accent hover:bg-raised"
                  >
                    +{item.events.length - shown.length} more changes
                  </button>
                )}
                {shown.map((event) => {
                  const targets = nodesOf(event).filter((id) => flow.nodes.has(id));
                  return (
                    <EventLine
                      key={event.id}
                      event={event}
                      meId={meId}
                      variant="compact"
                      onFocus={targets.length > 0 ? () => focus(targets) : undefined}
                    />
                  );
                })}
              </div>
            );
          }

          const m = item.event;
          const mine = m.actorId === meId;
          // Only label the first of several messages in a row from the same person.
          const prevItem = items[i - 1];
          const prev = prevItem?.type === "message" ? prevItem.event : undefined;
          const grouped = prev?.actorId === m.actorId && m.createdAt.getTime() - prev.createdAt.getTime() < 5 * 60_000;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start", grouped && "-mt-1.5")}>
              {!grouped && (
                <div className="mb-0.5 flex items-center gap-1.5 px-1 text-[11px]">
                  {!mine && (
                    <span className="font-medium" style={{ color: colorFor(m.actorId ?? m.actorName) }}>
                      {m.actorName}
                    </span>
                  )}
                  <time dateTime={m.createdAt.toISOString()} title={m.createdAt.toLocaleString()} className="text-muted">
                    {timeAgo(m.createdAt)}
                  </time>
                </div>
              )}
              <p
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-1.5 text-sm break-words whitespace-pre-wrap",
                  mine ? "rounded-br-md bg-accent text-bg" : "rounded-bl-md bg-raised text-fg",
                )}
              >
                {m.data.text}
              </p>
            </div>
          );
        })}
      </div>

      <form
        className="p-2 pt-1"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="flex items-end gap-2 rounded-xl border border-line bg-bg p-1.5 pl-2.5 transition focus-within:border-accent">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={canSend ? "Message… (Shift+Enter for new line)" : "Reconnecting…"}
            disabled={!canSend}
            aria-label="Message"
            className="field-sizing-content max-h-28 min-h-7 flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!canSend || !draft.trim()}
            aria-label="Send message"
            className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-bg transition hover:brightness-110 disabled:opacity-30"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
