import { issueGuestToken } from "@/server/guest";

/** Refreshes the guest token for a public link (they expire after an hour). */
export async function GET(_req: Request, { params }: RouteContext<"/api/share/[token]/collab-token">) {
  const issued = await issueGuestToken((await params).token);
  if (!issued) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ token: issued.token }, { headers: { "Cache-Control": "no-store" } });
}
