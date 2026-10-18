"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { ChevronDown, MessagesSquare } from "lucide-react";
import type { FlowEvent } from "@flowcraft/db/schema";
import { InspectorContent, useInspectorTarget } from "@/components/editor/Inspector";
import { useLiveActivity } from "@/lib/activity";
import { useTimeline } from "@/lib/use-timeline";
import { cn } from "@/lib/cn";
import { ChatPanel } from "./ChatPanel";

const LAYOUT_KEY = "flowcraft:sidebar:v2";
const MIN_CHAT = 160;
const MIN_TOP = 180;
const DEFAULT_CHAT = 320;
const KEY_STEP = 32;
/** Resize handle (6px once its negative margin is applied) plus the 36px header. */
const COLLAPSED = 42;

interface Layout {
  chatHeight: number;
  chatOpen: boolean;
}

// Per-browser preference; storage may be unavailable, which just means defaults.
function readLayout(): Layout {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "null");
    if (saved && typeof saved.chatHeight === "number" && typeof saved.chatOpen === "boolean") return saved;
  } catch {}
  return { chatHeight: DEFAULT_CHAT, chatOpen: true };
}

function saveLayout(layout: Layout) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {}
}

interface Props {
  flowId: string;
  provider: HocuspocusProvider | null;
  me: { id: string };
  canSend: boolean;
}

/**
 * The right sidebar for saved flows. Chat (with changes shown inline) is
 * always there; the inspector slides in above it only when there's something
 * to inspect: a selected node, or problems stopping a workflow from running.
 * With nothing to inspect, chat takes the whole column.
 */
export function CollabSidebar({ flowId, provider, me, canSend }: Props) {
  const changes = useTimeline(flowId, provider, "changes");
  const chat = useTimeline(flowId, provider, "chat");
  const inspecting = useInspectorTarget() !== null;
  const [layout, setLayout] = useState<Layout>({ chatHeight: DEFAULT_CHAT, chatOpen: true });
  const [dragging, setDragging] = useState(false);
  const [unread, setUnread] = useState(0);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => setLayout(readLayout()), []);

  const updateLayout = useCallback((next: Partial<Layout>) => {
    setLayout((prev) => {
      const merged = { ...prev, ...next };
      saveLayout(merged);
      return merged;
    });
  }, []);

  const clampHeight = (height: number) => {
    const total = asideRef.current?.clientHeight ?? 800;
    return Math.round(Math.min(Math.max(height, MIN_CHAT), total - MIN_TOP));
  };

  // Chat can only be collapsed when something else is using the space.
  const chatOpen = layout.chatOpen || !inspecting;

  useLiveActivity(
    provider,
    useCallback(
      (event: FlowEvent) => {
        if (event.kind === "message" && event.actorId !== me.id && !chatOpen) setUnread((n) => n + 1);
      },
      [me.id, chatOpen],
    ),
  );
  useEffect(() => {
    if (chatOpen) setUnread(0);
  }, [chatOpen]);

  const toggleChat = () => updateLayout({ chatOpen: !layout.chatOpen });

  const onHandlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!chatOpen) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startHeight = layout.chatHeight;
    setDragging(true);
    const onMove = (e: PointerEvent) => setLayout((prev) => ({ ...prev, chatHeight: clampHeight(startHeight + startY - e.clientY) }));
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      setDragging(false);
      setLayout((prev) => {
        saveLayout(prev);
        return prev;
      });
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
  };

  return (
    <aside ref={asideRef} data-tour="inspector" className="flex w-80 shrink-0 flex-col border-l border-line bg-panel">
      {inspecting && (
        <div className="min-h-0 flex-1 overflow-y-auto motion-safe:animate-panel-in">
          <InspectorContent />
        </div>
      )}

      <section
        aria-label="Chat"
        className={cn(
          "flex min-h-0 flex-col overflow-hidden",
          inspecting ? "shrink-0 border-t border-line" : "flex-1",
          inspecting && !dragging && "transition-[height] duration-200 ease-out",
        )}
        style={inspecting ? { height: chatOpen ? layout.chatHeight : COLLAPSED } : undefined}
      >
        {inspecting && (
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize chat"
            aria-valuemin={MIN_CHAT}
            aria-valuenow={layout.chatHeight}
            tabIndex={chatOpen ? 0 : -1}
            onPointerDown={onHandlePointerDown}
            onDoubleClick={toggleChat}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") updateLayout({ chatHeight: clampHeight(layout.chatHeight + KEY_STEP) });
              else if (e.key === "ArrowDown") updateLayout({ chatHeight: clampHeight(layout.chatHeight - KEY_STEP) });
              else if (e.key === "Enter") toggleChat();
              else return;
              e.preventDefault();
            }}
            className={cn("group -mt-1.5 flex h-3 shrink-0 items-center justify-center outline-none", chatOpen && "cursor-row-resize")}
          >
            <span
              className={cn(
                "h-1 w-10 rounded-full bg-line transition group-hover:bg-muted group-focus-visible:bg-accent",
                dragging && "bg-accent",
                !chatOpen && "opacity-0",
              )}
            />
          </div>
        )}
        <div className={cn("flex h-9 shrink-0 items-center gap-2 px-3", !inspecting && "border-b border-line")}>
          <MessagesSquare className="size-4 text-accent" />
          <h2 className="flex-1 text-sm font-medium">Chat</h2>
          {unread > 0 && (
            <span className="min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-semibold text-bg">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          {inspecting && (
            <button
              type="button"
              onClick={toggleChat}
              aria-expanded={chatOpen}
              aria-label={chatOpen ? "Collapse chat" : "Expand chat"}
              className="rounded-md p-1 text-muted transition hover:bg-raised hover:text-fg"
            >
              <ChevronDown className={cn("size-4 transition-transform", !chatOpen && "rotate-180")} />
            </button>
          )}
        </div>
        {chatOpen && (
          <div className="min-h-0 flex-1">
            <ChatPanel timeline={chat} changes={changes} provider={provider} meId={me.id} canSend={canSend} />
          </div>
        )}
      </section>
    </aside>
  );
}
