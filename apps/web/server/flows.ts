import { nanoid } from "nanoid";
import {
  and,
  desc,
  eq,
  flow,
  flowAccess,
  flowEvent,
  flowVersion,
  isNotNull,
  isNull,
  loadFlowDoc,
  lt,
  ne,
  or,
  snapshotOf,
  user,
  workspaceMember,
  type Db,
  type FlowEvent,
} from "@flowcraft/db";

export { applyFlowUpdate, InvalidUpdateError, loadFlowDoc, snapshotOf } from "@flowcraft/db";

export type Role = "owner" | "editor" | "viewer";
const rank: Record<Role, number> = { viewer: 0, editor: 1, owner: 2 };

export interface Viewer {
  id: string;
  email: string;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** The stronger of two optional roles. */
function strongest(a: Role | null, b: Role | null): Role | null {
  if (!a) return b;
  if (!b) return a;
  return rank[a] >= rank[b] ? a : b;
}

/** Joins that give a user access to a flow: workspace membership, or a share to their email. */
function accessJoins(viewer: Viewer) {
  return {
    member: and(eq(workspaceMember.workspaceId, flow.workspaceId), eq(workspaceMember.userId, viewer.id)),
    share: and(eq(flowAccess.flowId, flow.id), eq(flowAccess.email, normalizeEmail(viewer.email))),
  };
}

/**
 * A flow's metadata plus the caller's effective role, or null if they can't
 * see it. Deleted flows are returned (with `deletedAt` set) so they can be
 * restored; callers decide whether to treat them as missing.
 */
export async function findFlowForUser(db: Db, viewer: Viewer, flowId: string, minRole: Role = "viewer") {
  const joins = accessJoins(viewer);
  const [row] = await db
    .select({
      id: flow.id,
      title: flow.title,
      mode: flow.mode,
      workspaceId: flow.workspaceId,
      publicToken: flow.publicToken,
      updatedAt: flow.updatedAt,
      deletedAt: flow.deletedAt,
      memberRole: workspaceMember.role,
      sharedRole: flowAccess.role,
    })
    .from(flow)
    .leftJoin(workspaceMember, joins.member)
    .leftJoin(flowAccess, joins.share)
    .where(eq(flow.id, flowId));

  const role = row ? strongest(row.memberRole, row.sharedRole) : null;
  if (!row || !role || rank[role] < rank[minRole]) return null;
  const { memberRole, sharedRole: _, ...meta } = row;
  return { ...meta, role, shared: !memberRole };
}

/** Flows in the user's workspaces plus flows shared with them, newest first. */
export async function listFlows(db: Db, viewer: Viewer) {
  const joins = accessJoins(viewer);
  const rows = await db
    .select({
      id: flow.id,
      title: flow.title,
      mode: flow.mode,
      snapshot: flow.snapshot,
      updatedAt: flow.updatedAt,
      memberRole: workspaceMember.role,
      sharedRole: flowAccess.role,
    })
    .from(flow)
    .leftJoin(workspaceMember, joins.member)
    .leftJoin(flowAccess, joins.share)
    .where(and(isNull(flow.deletedAt), or(isNotNull(workspaceMember.userId), isNotNull(flowAccess.email))))
    .orderBy(desc(flow.updatedAt));

  return rows.map(({ memberRole, sharedRole, ...row }) => ({
    ...row,
    role: strongest(memberRole, sharedRole)!,
    shared: !memberRole,
  }));
}

export async function findFlowByPublicToken(db: Db, token: string) {
  return db.query.flow.findFirst({
    columns: { id: true, title: true, mode: true },
    where: and(eq(flow.publicToken, token), isNull(flow.deletedAt)),
  });
}

export async function createFlow(
  db: Db,
  input: { workspaceId: string; userId: string; title: string; mode: "workflow" | "diagram" },
) {
  const id = nanoid(12);
  await db.insert(flow).values({ id, workspaceId: input.workspaceId, createdBy: input.userId, title: input.title, mode: input.mode });
  return id;
}

/** Copies a flow into the given workspace (the caller's own, for shared flows). */
export async function duplicateFlow(db: Db, flowId: string, userId: string, workspaceId: string) {
  const source = await db.query.flow.findFirst({ where: eq(flow.id, flowId) });
  if (!source) return null;
  const id = nanoid(12);
  await db.insert(flow).values({
    id,
    workspaceId,
    createdBy: userId,
    title: `${source.title} (copy)`,
    mode: source.mode,
    doc: source.doc,
    snapshot: source.snapshot,
  });
  return id;
}

export async function setFlowDeleted(db: Db, flowId: string, deleted: boolean) {
  await db.update(flow).set({ deletedAt: deleted ? new Date() : null }).where(eq(flow.id, flowId));
}

export async function renameFlow(db: Db, flowId: string, title: string) {
  await db.update(flow).set({ title }).where(eq(flow.id, flowId));
}

// --- Sharing -----------------------------------------------------------------

export async function listShares(db: Db, flowId: string) {
  return db
    .select({ email: flowAccess.email, role: flowAccess.role, name: user.name, createdAt: flowAccess.createdAt })
    .from(flowAccess)
    .leftJoin(user, eq(user.email, flowAccess.email))
    .where(eq(flowAccess.flowId, flowId))
    .orderBy(flowAccess.createdAt);
}

export async function upsertShare(db: Db, input: { flowId: string; email: string; role: "editor" | "viewer"; invitedBy: string }) {
  await db
    .insert(flowAccess)
    .values({ ...input, email: normalizeEmail(input.email) })
    .onConflictDoUpdate({ target: [flowAccess.flowId, flowAccess.email], set: { role: input.role } });
}

export async function removeShare(db: Db, flowId: string, email: string) {
  await db.delete(flowAccess).where(and(eq(flowAccess.flowId, flowId), eq(flowAccess.email, normalizeEmail(email))));
}

export async function setPublicLink(db: Db, flowId: string, enabled: boolean) {
  const token = enabled ? nanoid(24) : null;
  await db.update(flow).set({ publicToken: token }).where(eq(flow.id, flowId));
  return token;
}

// --- Versions ----------------------------------------------------------------

export async function listVersions(db: Db, flowId: string) {
  return db
    .select({
      id: flowVersion.id,
      label: flowVersion.label,
      snapshot: flowVersion.snapshot,
      createdAt: flowVersion.createdAt,
      author: user.name,
      authorEmail: user.email,
    })
    .from(flowVersion)
    .leftJoin(user, eq(user.id, flowVersion.createdBy))
    .where(eq(flowVersion.flowId, flowId))
    .orderBy(desc(flowVersion.createdAt))
    .limit(100);
}

/** Saves the flow's current stored state as a version. Returns null for an empty flow. */
export async function createVersion(db: Db, input: { flowId: string; label: string | null; userId: string | null }) {
  const doc = await loadFlowDoc(db, input.flowId);
  if (!doc) return null;
  const id = nanoid(12);
  await db.insert(flowVersion).values({
    id,
    flowId: input.flowId,
    doc,
    snapshot: snapshotOf(doc),
    label: input.label,
    createdBy: input.userId,
  });
  return id;
}

export async function getVersion(db: Db, flowId: string, versionId: string) {
  return db.query.flowVersion.findFirst({
    columns: { doc: true, label: true },
    where: and(eq(flowVersion.id, versionId), eq(flowVersion.flowId, flowId)),
  });
}

// --- Activity ----------------------------------------------------------------

export const ACTIVITY_PAGE_SIZE = 50;

export type ActivityScope = "all" | "changes" | "chat";

const scopeFilter = {
  all: undefined,
  changes: ne(flowEvent.kind, "message"),
  chat: eq(flowEvent.kind, "message"),
};

/** Newest-first page of a flow's timeline, optionally older than `before`. */
export async function listActivity(db: Db, flowId: string, { before, scope = "all" }: { before?: Date; scope?: ActivityScope } = {}) {
  const rows = await db
    .select()
    .from(flowEvent)
    .where(and(eq(flowEvent.flowId, flowId), scopeFilter[scope], before ? lt(flowEvent.createdAt, before) : undefined))
    .orderBy(desc(flowEvent.createdAt), desc(flowEvent.id))
    .limit(ACTIVITY_PAGE_SIZE + 1);
  return {
    events: rows.slice(0, ACTIVITY_PAGE_SIZE) as FlowEvent[],
    hasMore: rows.length > ACTIVITY_PAGE_SIZE,
  };
}
