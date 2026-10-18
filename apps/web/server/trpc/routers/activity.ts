import { z } from "zod";
import { listActivity } from "@/server/flows";
import { requireFlow } from "../access";
import { protectedProcedure, router } from "../init";

export const activityRouter = router({
  /** The flow's timeline (changes and chat), newest first, 50 at a time. */
  list: protectedProcedure
    .input(
      z.object({
        flowId: z.string().min(1),
        before: z.date().optional(),
        /** "changes" for the activity log, "chat" for messages, "all" for both. */
        scope: z.enum(["all", "changes", "chat"]).default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireFlow(ctx.db, ctx.user, input.flowId, "viewer");
      return listActivity(ctx.db, input.flowId, { before: input.before, scope: input.scope });
    }),
});
