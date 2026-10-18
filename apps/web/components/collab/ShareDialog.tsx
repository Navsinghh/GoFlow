"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Globe, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Notice, type NoticeValue } from "@/components/ui/Notice";
import { useTRPC } from "@/lib/trpc/client";

type ShareRole = "editor" | "viewer";

const inputClass =
  "rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

export function ShareDialog({ flowId, open, onClose }: { flowId: string; open: boolean; onClose: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("editor");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<NoticeValue>(null);

  const shareKey = trpc.share.list.queryKey({ flowId });
  const { data } = useQuery(trpc.share.list.queryOptions({ flowId }, { enabled: open }));
  const refresh = () => queryClient.invalidateQueries({ queryKey: shareKey });

  const invite = useMutation(
    trpc.share.invite.mutationOptions({
      onSuccess: (_, vars) => {
        if (vars.notify) {
          setNotice({ kind: "success", text: `Invite sent to ${vars.email}` });
          setEmail("");
        }
      },
      onError: (error) => setNotice({ kind: "error", text: error.message }),
      onSettled: refresh,
    }),
  );
  const remove = useMutation(trpc.share.remove.mutationOptions({ onSettled: refresh }));
  const setPublic = useMutation(
    trpc.share.setPublic.mutationOptions({
      onError: () => setNotice({ kind: "error", text: "Couldn't update the public link" }),
      onSettled: refresh,
    }),
  );

  const publicUrl = data?.publicToken ? `${window.location.origin}/share/${data.publicToken}` : null;

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const close = () => {
    setNotice(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title="Share flow" description="Invite people by email. They'll get access as soon as they sign in.">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          invite.mutate({ flowId, email, role, notify: true });
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setNotice(null);
          }}
          placeholder="teammate@example.com"
          aria-label="Email to invite"
          className={`${inputClass} min-w-0 flex-1`}
        />
        <select value={role} onChange={(e) => setRole(e.target.value as ShareRole)} aria-label="Role" className={inputClass}>
          <option value="editor">Can edit</option>
          <option value="viewer">Can view</option>
        </select>
        <button
          type="submit"
          disabled={invite.isPending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:brightness-110 disabled:opacity-60"
        >
          {invite.isPending ? "Sending…" : "Invite"}
        </button>
      </form>
      <Notice notice={notice} className="mt-3" />

      <section className="mt-6">
        <h3 className="text-xs font-medium tracking-wide text-muted uppercase">People with access</h3>
        <ul className="mt-2 divide-y divide-line">
          <li className="flex items-center gap-3 py-2.5 text-sm">
            <span className="flex-1">You</span>
            <span className="text-xs text-muted">Owner</span>
          </li>
          {data?.people.map((person) => (
            <li key={person.email} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">{person.name || person.email}</p>
                <p className="truncate text-xs text-muted">{person.name ? person.email : "Hasn't signed up yet"}</p>
              </div>
              <select
                value={person.role}
                onChange={(e) => invite.mutate({ flowId, email: person.email, role: e.target.value as ShareRole, notify: false })}
                aria-label={`Role for ${person.email}`}
                className="rounded-md border border-line bg-bg px-2 py-1 text-xs"
              >
                <option value="editor">Can edit</option>
                <option value="viewer">Can view</option>
              </select>
              <button
                type="button"
                onClick={() => remove.mutate({ flowId, email: person.email })}
                aria-label={`Remove ${person.email}`}
                className="rounded-md p-1.5 text-muted transition hover:bg-danger/15 hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-bg p-4">
        <label className="flex items-center gap-3">
          <Globe className="size-4 text-accent" />
          <span className="flex-1">
            <span className="block text-sm font-medium">Public link</span>
            <span className="block text-xs text-muted">Anyone with the link can view, without signing in.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={Boolean(data?.publicToken)}
            disabled={!data || setPublic.isPending}
            onChange={(e) => setPublic.mutate({ flowId, enabled: e.target.checked })}
            className="size-4 accent-accent"
          />
        </label>
        {publicUrl && (
          <div className="mt-3 flex gap-2">
            <input readOnly value={publicUrl} aria-label="Public link" className={`${inputClass} min-w-0 flex-1 font-mono text-xs`} onFocus={(e) => e.target.select()} />
            <button type="button" onClick={copyLink} className="flex items-center gap-1.5 rounded-lg border border-line px-3 text-sm transition hover:bg-raised">
              {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </section>
    </Dialog>
  );
}
