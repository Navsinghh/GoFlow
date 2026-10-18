"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History } from "lucide-react";
import { toast } from "sonner";
import * as Y from "yjs";
import type { FlowEdge, FlowNode } from "@flowcraft/flow-engine";
import { FlowPreview } from "@/components/FlowPreview";
import { Dialog } from "@/components/ui/Dialog";
import { Notice, type NoticeValue } from "@/components/ui/Notice";
import { decodeBase64 } from "@/lib/base64";
import { replaceGraph, type FlowDoc } from "@/lib/flow-doc";
import { timeAgo } from "@/lib/time";
import { useTRPC } from "@/lib/trpc/client";

interface Props {
  flowId: string;
  flow: FlowDoc;
  canEdit: boolean;
  open: boolean;
  onClose: () => void;
}

export function VersionHistory({ flowId, flow, canEdit, open, onClose }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [notice, setNotice] = useState<NoticeValue>(null);
  const listKey = trpc.version.list.queryKey({ flowId });
  const { data: versions, isPending } = useQuery(trpc.version.list.queryOptions({ flowId }, { enabled: open }));

  const markRestored = useMutation(trpc.version.markRestored.mutationOptions());
  const save = useMutation(
    trpc.version.create.mutationOptions({
      onSuccess: (_, vars) => {
        setLabel("");
        setNotice({ kind: "success", text: `Saved “${vars.label}”` });
      },
      onError: (error) => setNotice({ kind: "error", text: error.message }),
      onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
    }),
  );

  /**
   * Restoring writes the old graph into the live document as a normal local
   * edit: collaborators see it immediately and Ctrl+Z undoes it.
   */
  const restore = async (versionId: string, name: string) => {
    try {
      const { state } = await queryClient.fetchQuery(trpc.version.get.queryOptions({ flowId, versionId }));
      const old = new Y.Doc();
      Y.applyUpdate(old, decodeBase64(state));
      replaceGraph(flow, {
        nodes: [...old.getMap<FlowNode>("nodes").values()],
        edges: [...old.getMap<FlowEdge>("edges").values()],
      });
      old.destroy();
      markRestored.mutate({ flowId, versionId });
      close();
      // The sheet closes first, so this toast isn't hidden behind its backdrop.
      toast.success(`Restored ${name}`, { duration: 8000, action: { label: "Undo", onClick: () => flow.undoManager.undo() } });
    } catch {
      setNotice({ kind: "error", text: "Couldn't restore that version" });
    }
  };

  const close = () => {
    setNotice(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      variant="sheet"
      title="Version history"
      description="Snapshots are saved automatically every 10 minutes while people edit."
    >
      {canEdit && (
        <form
          className="mb-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ flowId, label });
          }}
        >
          <input
            required
            maxLength={80}
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setNotice(null);
            }}
            placeholder="Name this version"
            aria-label="Version name"
            className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-bg transition hover:brightness-110 disabled:opacity-60"
          >
            Save
          </button>
        </form>
      )}
      <Notice notice={notice} className="-mt-3 mb-6" />

      {isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : versions?.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted">
          <History className="mx-auto mb-3 size-6" />
          No versions yet.
        </div>
      ) : (
        <ol className="space-y-3">
          {versions?.map((version) => {
            const name = version.label ?? "Auto-save";
            return (
              <li key={version.id} className="overflow-hidden rounded-lg border border-line">
                <div className="aspect-[2/1] bg-canvas p-2">
                  <FlowPreview snapshot={version.snapshot} />
                </div>
                <div className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className={version.label ? "truncate text-sm font-medium" : "text-sm text-muted"}>{name}</p>
                    <p className="text-xs text-muted">
                      {timeAgo(new Date(version.createdAt))}
                      {version.author && ` · ${version.author}`}
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => restore(version.id, name)}
                      className="rounded-md border border-line px-2.5 py-1 text-xs transition hover:border-accent hover:text-accent"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Dialog>
  );
}
