"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IndexeddbPersistence } from "y-indexeddb";
import { createFlowDoc, replaceGraph, type FlowDoc } from "@/lib/flow-doc";
import { seedGraph } from "@/lib/seed";
import { Editor } from "@/components/editor/Editor";

/** Local-only flow persisted in IndexedDB, until accounts land. */
export function Playground() {
  const [flow, setFlow] = useState<FlowDoc | null>(null);

  useEffect(() => {
    const flow = createFlowDoc();
    const persistence = new IndexeddbPersistence("flowcraft:playground", flow.doc);
    let cancelled = false;
    void persistence.whenSynced.then(() => {
      if (cancelled) return;
      // Seeding isn't a user action, so it uses a non-local origin and can't be undone.
      if (flow.nodes.size === 0) replaceGraph(flow, seedGraph, "seed");
      setFlow(flow);
    });
    return () => {
      cancelled = true;
      void persistence.destroy();
      flow.doc.destroy();
    };
  }, []);

  if (!flow) return <div className="grid h-dvh place-items-center text-sm text-muted">Loading flow…</div>;
  return (
    <Editor
      flow={flow}
      title={<h1 className="text-sm font-medium">Playground</h1>}
      fileName="playground"
      homeHref="/"
      actions={
        <Link
          href="/sign-in"
          className="mr-2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-bg transition hover:brightness-110"
        >
          Sign up to save flows
        </Link>
      }
    />
  );
}
