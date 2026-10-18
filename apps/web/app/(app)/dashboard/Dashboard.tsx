"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { Plus, Search, Shapes, Workflow } from "lucide-react";
import { toast } from "sonner";
import type { AppRouter } from "@/server/trpc/router";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/cn";
import { UserMenu } from "@/components/UserMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FlowCard } from "./FlowCard";

export type FlowSummary = inferRouterOutputs<AppRouter>["flow"]["list"][number];
type Mode = FlowSummary["mode"];

const newFlowOptions: { mode: Mode; label: string; icon: typeof Workflow; blurb: string }[] = [
  { mode: "diagram", label: "Diagram", icon: Shapes, blurb: "Shapes and connectors for flow maps" },
  { mode: "workflow", label: "Workflow", icon: Workflow, blurb: "Typed nodes that run as a pipeline" },
];

export function Dashboard({ initialFlows, user }: { initialFlows: FlowSummary[]; user: { name: string; email: string } }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<FlowSummary | null>(null);

  const listKey = trpc.flow.list.queryKey();
  const { data: flows = [] } = useQuery(trpc.flow.list.queryOptions(undefined, { initialData: initialFlows }));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: listKey });

  const create = useMutation(
    trpc.flow.create.mutationOptions({
      onSuccess: ({ id }) => router.push(`/flow/${id}`),
      onError: () => toast.error("Couldn't create the flow"),
    }),
  );
  const restore = useMutation(trpc.flow.restore.mutationOptions({ onSettled: invalidate }));
  const remove = useMutation(
    trpc.flow.delete.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: listKey });
        const previous = queryClient.getQueryData(listKey);
        queryClient.setQueryData(listKey, (old) => old?.filter((f) => f.id !== id));
        return { previous };
      },
      onSuccess: (_, { id }) =>
        toast("Flow deleted", { duration: 10_000, action: { label: "Undo", onClick: () => restore.mutate({ id }) } }),
      onError: (_, __, context) => {
        queryClient.setQueryData(listKey, context?.previous);
        toast.error("Couldn't delete the flow");
      },
    }),
  );
  const rename = useMutation(
    trpc.flow.rename.mutationOptions({
      onMutate: async ({ id, title }) => {
        await queryClient.cancelQueries({ queryKey: listKey });
        queryClient.setQueryData(listKey, (old) => old?.map((f) => (f.id === id ? { ...f, title } : f)));
      },
      onError: () => toast.error("Couldn't rename the flow"),
      onSettled: invalidate,
    }),
  );
  const duplicate = useMutation(
    trpc.flow.duplicate.mutationOptions({
      onSuccess: () => toast.success("Flow duplicated"),
      onError: () => toast.error("Couldn't duplicate the flow"),
      onSettled: invalidate,
    }),
  );

  const q = query.trim().toLowerCase();
  const visible = q ? flows.filter((f) => f.title.toLowerCase().includes(q)) : flows;
  const sections = [
    { title: "Your flows", items: visible.filter((f) => !f.shared) },
    { title: "Shared with you", items: visible.filter((f) => f.shared) },
  ].filter((s) => s.items.length > 0);

  const renderCard = (flow: FlowSummary) => (
    <FlowCard
      key={flow.id}
      flow={flow}
      onRename={(title) => rename.mutate({ id: flow.id, title })}
      onDuplicate={() => duplicate.mutate({ id: flow.id })}
      onDelete={() => setPendingDelete(flow)}
    />
  );

  return (
    <div data-page-scroll className="min-h-dvh">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <span className="font-mono text-sm text-accent">flowcraft</span>
          <div className="ml-auto">
            <UserMenu {...user} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your flows</h1>
            <p className="mt-1 text-sm text-muted">
              {flows.length === 1 ? "1 flow" : `${flows.length} flows`}, saved automatically
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {newFlowOptions.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                disabled={create.isPending}
                onClick={() => create.mutate({ mode })}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-60",
                  mode === "diagram" ? "bg-accent text-bg hover:brightness-110" : "border border-line bg-panel hover:bg-raised",
                )}
              >
                <Plus className="size-4" />
                <Icon className="size-4" />
                New {label.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {flows.length > 0 && (
          <label className="mt-8 flex max-w-sm items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm focus-within:border-accent">
            <Search className="size-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search flows"
              aria-label="Search flows"
              className="w-full bg-transparent outline-none placeholder:text-muted"
            />
          </label>
        )}

        {flows.length === 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {newFlowOptions.map(({ mode, label, icon: Icon, blurb }) => (
              <button
                key={mode}
                type="button"
                disabled={create.isPending}
                onClick={() => create.mutate({ mode })}
                className="rounded-xl border border-dashed border-line p-8 text-left transition hover:border-accent hover:bg-panel"
              >
                <Icon className="size-6 text-accent" />
                <p className="mt-4 font-medium">Start a {label.toLowerCase()}</p>
                <p className="mt-1 text-sm text-muted">{blurb}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6 space-y-10">
            {sections.map((section) => (
              <section key={section.title} aria-labelledby={`section-${section.title}`}>
                {/* Only label sections when there's more than one. */}
                {sections.length > 1 && (
                  <h2 id={`section-${section.title}`} className="mb-3 text-sm font-medium text-muted">
                    {section.title}
                  </h2>
                )}
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{section.items.map(renderCard)}</ul>
              </section>
            ))}
            {visible.length === 0 && <p className="text-sm text-muted">No flows match “{query}”.</p>}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this flow?"
        description={
          <>
            <strong className="text-fg">{pendingDelete?.title}</strong> will be removed from your flows, and anyone you
            shared it with will lose access. You can undo this right after.
          </>
        }
        confirmLabel="Delete flow"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) remove.mutate({ id: pendingDelete.id });
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
