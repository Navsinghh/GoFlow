import "server-only";
import { signCollabToken } from "@flowcraft/collab/token";
import type { FlowEvent } from "@flowcraft/db";
import { env } from "./env";

export function issueCollabToken(claims: Parameters<typeof signCollabToken>[0]) {
  return signCollabToken(claims, env.COLLAB_SECRET);
}

/**
 * Tells the collaboration server about an event so it reaches everyone in
 * the flow right away. Best effort: if the server is down, people still see
 * the event the next time they load the timeline.
 */
export function publishEvent(event: FlowEvent) {
  void fetch(`${env.COLLAB_INTERNAL_URL}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.COLLAB_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(2000),
  }).catch((error) => console.warn("Couldn't publish activity event:", error.message));
}
