import { nanoid } from "nanoid";
import { flowEvent, type FlowEvent, type FlowEventData, type FlowEventKind } from "./schema";
import type { Db } from "./index";

export interface Actor {
  /** Null for guests, who have no account. */
  id: string | null;
  name: string;
}

export async function recordEvent<K extends FlowEventKind>(
  db: Db,
  input: { flowId: string; actor: Actor; kind: K; data: FlowEventData[K] },
): Promise<FlowEvent> {
  const [row] = await db
    .insert(flowEvent)
    .values({ id: nanoid(14), flowId: input.flowId, actorId: input.actor.id, actorName: input.actor.name, kind: input.kind, data: input.data })
    .returning();
  return row as FlowEvent;
}
