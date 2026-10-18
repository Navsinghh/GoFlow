import { nanoid } from "nanoid";
import { eq, workspace, workspaceMember, type Db } from "@flowcraft/db";

/** Returns the user's personal workspace id, creating it if it doesn't exist yet. */
export async function ensurePersonalWorkspace(db: Db, user: { id: string; name: string; email: string }) {
  const existing = await db.query.workspace.findFirst({
    columns: { id: true },
    where: eq(workspace.personalFor, user.id),
  });
  if (existing) return existing.id;

  const owner = user.name.trim() || user.email.split("@")[0];
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(workspace)
      .values({ id: nanoid(12), name: `${owner}'s workspace`, personalFor: user.id })
      .onConflictDoNothing({ target: workspace.personalFor })
      .returning({ id: workspace.id });
    // Lost a race with a concurrent request; the other one created it.
    if (!created) {
      const winner = await tx.query.workspace.findFirst({ where: eq(workspace.personalFor, user.id) });
      return winner!.id;
    }
    await tx.insert(workspaceMember).values({ workspaceId: created.id, userId: user.id, role: "owner" });
    return created.id;
  });
}
