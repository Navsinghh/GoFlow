import { TRPCError } from "@trpc/server";
import type { Db } from "@flowcraft/db";
import { findFlowForUser, type Role, type Viewer } from "@/server/flows";

/**
 * Loads a flow the user may act on with at least `minRole`, or throws
 * NOT_FOUND. Missing access deliberately looks the same as a missing flow so
 * ids can't be probed.
 */
export async function requireFlow(
  db: Db,
  viewer: Viewer,
  id: string,
  minRole: Role,
  { includeDeleted = false }: { includeDeleted?: boolean } = {},
) {
  const found = await findFlowForUser(db, viewer, id, minRole);
  if (!found || (found.deletedAt && !includeDeleted)) throw new TRPCError({ code: "NOT_FOUND", message: "Flow not found" });
  return found;
}
