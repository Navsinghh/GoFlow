"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { History, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { NodeMode } from "@flowcraft/node-registry";
import { Editor } from "@/components/editor/Editor";
import { CollabSidebar } from "@/components/collab/CollabSidebar";
import { CollabStatusBadge, useInitialFlowDoc } from "@/components/collab/live";
import { ShareDialog } from "@/components/collab/ShareDialog";
import { VersionHistory } from "@/components/collab/VersionHistory";
import { PresenceAvatars } from "@/components/presence/PresenceAvatars";
import { UserMenu } from "@/components/UserMenu";
import { colorFor } from "@/lib/presence";
import { useTRPC } from "@/lib/trpc/client";
import { useCollab } from "@/lib/use-collab";

interface Props {
  id: string;
  title: string;
  mode: NodeMode;
  role: "owner" | "editor" | "viewer";
  initialState: string | null;
  user: { id: string; name: string; email: string };
}

const toolButton =
  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted transition hover:bg-raised hover:text-fg";

function EditableTitle({ id, initial, editable }: { id: string; initial: string; editable: boolean }) {
  const trpc = useTRPC();
  const [title, setTitle] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const rename = useMutation(
    trpc.flow.rename.mutationOptions({
      onSuccess: (_, vars) => {
        setSaved(vars.title);
        document.title = `${vars.title} · Flowcraft`;
      },
      onError: () => {
        setTitle(saved);
        toast.error("Couldn't rename the flow");
      },
    }),
  );

  if (!editable) return <h1 className="text-sm font-medium">{initial}</h1>;

  const commit = () => {
    const next = title.trim();
    if (!next) return setTitle(saved);
    if (next !== saved) rename.mutate({ id, title: next });
  };

  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setTitle(saved);
          requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
        }
      }}
      aria-label="Flow title"
      maxLength={120}
      className="field-sizing-content max-w-md min-w-24 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium outline-none transition hover:border-line focus:border-accent"
    />
  );
}

export function FlowEditor({ id, title, mode, role, initialState, user }: Props) {
  const flow = useInitialFlowDoc(initialState);
  const getToken = useCallback(async () => {
    const response = await fetch(`/api/flows/${id}/collab-token`);
    if (!response.ok) throw new Error(`Couldn't get a collaboration token (${response.status})`);
    return ((await response.json()) as { token: string }).token;
  }, [id]);
  const me = useMemo(() => ({ id: user.id, name: user.name || user.email, color: colorFor(user.id) }), [user]);
  const { status, presence, provider } = useCollab(flow, id, getToken, me);
  const [panel, setPanel] = useState<"share" | "history" | null>(null);
  const canEdit = role !== "viewer";

  return (
    <>
      <Editor
        flow={flow}
        title={<EditableTitle id={id} initial={title} editable={canEdit} />}
        fileName={title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
        homeHref="/dashboard"
        initialMode={mode}
        readOnly={!canEdit}
        presence={presence}
        sidePanel={<CollabSidebar flowId={id} provider={provider} me={user} canSend={status === "live" || status === "saving"} />}
        actions={
          <>
            <PresenceAvatars />
            <CollabStatusBadge status={status} />
            <button type="button" className={toolButton} onClick={() => setPanel("history")}>
              <History className="size-4" /> History
            </button>
            {role === "owner" && (
              <button
                type="button"
                className="mr-1 flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-bg transition hover:brightness-110"
                onClick={() => setPanel("share")}
              >
                <Share2 className="size-3.5" /> Share
              </button>
            )}
            <span className="order-last ml-2">
              <UserMenu name={user.name} email={user.email} />
            </span>
          </>
        }
      />
      {role === "owner" && <ShareDialog flowId={id} open={panel === "share"} onClose={() => setPanel(null)} />}
      <VersionHistory flowId={id} flow={flow} canEdit={canEdit} open={panel === "history"} onClose={() => setPanel(null)} />
    </>
  );
}
