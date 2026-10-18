import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { findFlowByPublicToken, loadFlowDoc } from "@/server/flows";
import { SharedFlow } from "./SharedFlow";

export async function generateMetadata({ params }: PageProps<"/share/[token]">): Promise<Metadata> {
  const found = await findFlowByPublicToken(db, (await params).token);
  return {
    title: found ? `${found.title} · Flowcraft` : "Flowcraft",
    // Public links are unlisted, not public pages.
    robots: { index: false, follow: false },
  };
}

export default async function SharedFlowPage({ params }: PageProps<"/share/[token]">) {
  const { token } = await params;
  const found = await findFlowByPublicToken(db, token);
  if (!found) notFound();
  const state = await loadFlowDoc(db, found.id);

  return (
    <SharedFlow
      publicToken={token}
      flowId={found.id}
      title={found.title}
      mode={found.mode}
      initialState={state ? Buffer.from(state).toString("base64") : null}
    />
  );
}
