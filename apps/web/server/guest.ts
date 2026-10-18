import "server-only";
import { nanoid } from "nanoid";
import { issueCollabToken } from "@/lib/collab";
import { db } from "@/lib/db";
import { findFlowByPublicToken } from "./flows";

/** A view-only collaboration token for someone holding a public link. */
export async function issueGuestToken(publicToken: string) {
  const found = await findFlowByPublicToken(db, publicToken);
  if (!found) return null;
  const token = await issueCollabToken({ sub: `guest:${nanoid(8)}`, name: "Guest", flow: found.id, role: "viewer" });
  return { flow: found, token };
}
