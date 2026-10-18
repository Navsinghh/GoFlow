import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { recordEvent, type Db, type FlowEvent, type FlowEventData, type FlowEventKind } from "@flowcraft/db";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface Mailer {
  sendInvite(to: string, invite: { flowTitle: string; inviterName: string; url: string }): Promise<void>;
}

export interface Context {
  db: Db;
  user: SessionUser | null;
  /** Injected so tests can capture emails instead of sending them. */
  mailer: Mailer;
  /** Absolute base URL for links in emails. */
  appUrl: string;
  /** Pushes a recorded event to everyone currently in the flow (fire and forget). */
  publish: (event: FlowEvent) => void;
}

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const user = ctx.user;

  /** Adds an entry to the flow's activity timeline, attributed to the caller. */
  const logActivity = async <K extends FlowEventKind>(flowId: string, kind: K, data: FlowEventData[K]) => {
    const event = await recordEvent(ctx.db, { flowId, actor: { id: user.id, name: user.name || user.email }, kind, data });
    ctx.publish(event);
  };

  return next({ ctx: { ...ctx, user, logActivity } });
});
