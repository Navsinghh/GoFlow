"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { nanoid } from "nanoid";
import type { NodeMode } from "@flowcraft/node-registry";
import { Editor } from "@/components/editor/Editor";
import { CollabStatusBadge, useInitialFlowDoc } from "@/components/collab/live";
import { PresenceAvatars } from "@/components/presence/PresenceAvatars";
import { colorFor } from "@/lib/presence";
import { useCollab } from "@/lib/use-collab";

interface Props {
  publicToken: string;
  flowId: string;
  title: string;
  mode: NodeMode;
  initialState: string | null;
}

/** Read-only live view for anyone with a public link. */
export function SharedFlow({ publicToken, flowId, title, mode, initialState }: Props) {
  const flow = useInitialFlowDoc(initialState);
  const getToken = useCallback(async () => {
    const response = await fetch(`/api/share/${publicToken}/collab-token`);
    if (!response.ok) throw new Error("This link is no longer active");
    return ((await response.json()) as { token: string }).token;
  }, [publicToken]);
  const guest = useMemo(() => {
    const id = `guest-${nanoid(6)}`;
    return { id, name: "Guest", color: colorFor(id) };
  }, []);
  const { status, presence } = useCollab(flow, flowId, getToken, guest);

  return (
    <Editor
      flow={flow}
      title={<h1 className="text-sm font-medium">{title}</h1>}
      fileName={title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
      homeHref="/"
      initialMode={mode}
      readOnly
      presence={presence}
      actions={
        <>
          <PresenceAvatars />
          <CollabStatusBadge status={status} />
          <Link
            href="/sign-in"
            className="mr-2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-bg transition hover:brightness-110"
          >
            Make your own
          </Link>
        </>
      }
    />
  );
}
