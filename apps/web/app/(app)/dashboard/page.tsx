import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { api } from "@/server/trpc/server";
import { Dashboard } from "./Dashboard";

export const metadata: Metadata = { title: "Your flows · Flowcraft" };

export default async function DashboardPage() {
  const [session, caller] = await Promise.all([getSession(), api()]);
  const flows = await caller.flow.list();
  return <Dashboard initialFlows={flows} user={{ name: session!.user.name, email: session!.user.email }} />;
}
