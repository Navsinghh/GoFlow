import { auth } from "@/lib/auth";
import { issueCollabToken } from "@/lib/collab";
import { db } from "@/lib/db";
import { findFlowForUser } from "@/server/flows";

/** Issues a short-lived token the editor uses to join the flow's real-time session. */
export async function GET(req: Request, { params }: RouteContext<"/api/flows/[id]/collab-token">) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const found = await findFlowForUser(db, session.user, id);
  if (!found || found.deletedAt) return Response.json({ error: "Not found" }, { status: 404 });

  const token = await issueCollabToken({ sub: session.user.id, name: session.user.name || session.user.email, flow: id, role: found.role });
  return Response.json({ token }, { headers: { "Cache-Control": "no-store" } });
}
