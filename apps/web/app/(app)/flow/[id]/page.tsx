import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { loadFlowDoc } from "@/server/flows";
import { api } from "@/server/trpc/server";
import { FlowEditor } from "./FlowEditor";

async function getFlow(id: string) {
  try {
    return await (await api()).flow.get({ id });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps<"/flow/[id]">): Promise<Metadata> {
  const flow = await getFlow((await params).id);
  return { title: `${flow.title} · Flowcraft` };
}

export default async function FlowPage({ params }: PageProps<"/flow/[id]">) {
  const { id } = await params;
  const [flow, session] = await Promise.all([getFlow(id), getSession()]);
  // Access was checked by getFlow above.
  const state = await loadFlowDoc(db, id);

  return (
    <FlowEditor
      id={flow.id}
      title={flow.title}
      mode={flow.mode}
      role={flow.role}
      initialState={state ? Buffer.from(state).toString("base64") : null}
      user={{ id: session!.user.id, name: session!.user.name, email: session!.user.email }}
    />
  );
}
