import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { listShares, normalizeEmail, removeShare, setPublicLink, upsertShare } from "@/server/flows";
import { requireFlow } from "../access";
import { protectedProcedure, router } from "../init";

const flowId = z.object({ flowId: z.string().min(1) });

/** Managing who can see a flow is reserved for its owner. */
export const shareRouter = router({
  list: protectedProcedure.input(flowId).query(async ({ ctx, input }) => {
    const found = await requireFlow(ctx.db, ctx.user, input.flowId, "owner");
    return { people: await listShares(ctx.db, input.flowId), publicToken: found.publicToken };
  }),

  invite: protectedProcedure
    .input(
      flowId.extend({
        email: z.string().trim().toLowerCase().pipe(z.email()),
        role: z.enum(["editor", "viewer"]),
        /** False when only changing an existing person's role. */
        notify: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const found = await requireFlow(ctx.db, ctx.user, input.flowId, "owner");
      if (normalizeEmail(input.email) === normalizeEmail(ctx.user.email)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You already own this flow" });
      }
      await upsertShare(ctx.db, { flowId: input.flowId, email: input.email, role: input.role, invitedBy: ctx.user.id });
      await ctx.logActivity(input.flowId, input.notify ? "share.invited" : "share.role_changed", {
        email: input.email,
        role: input.role,
      });
      if (!input.notify) return;
      await ctx.mailer.sendInvite(normalizeEmail(input.email), {
        flowTitle: found.title,
        inviterName: ctx.user.name || ctx.user.email,
        url: `${ctx.appUrl}/flow/${input.flowId}`,
      });
    }),

  remove: protectedProcedure.input(flowId.extend({ email: z.string() })).mutation(async ({ ctx, input }) => {
    await requireFlow(ctx.db, ctx.user, input.flowId, "owner");
    await removeShare(ctx.db, input.flowId, input.email);
    await ctx.logActivity(input.flowId, "share.removed", { email: normalizeEmail(input.email) });
  }),

  setPublic: protectedProcedure.input(flowId.extend({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
    await requireFlow(ctx.db, ctx.user, input.flowId, "owner");
    const publicToken = await setPublicLink(ctx.db, input.flowId, input.enabled);
    await ctx.logActivity(input.flowId, input.enabled ? "link.enabled" : "link.disabled", {});
    return { publicToken };
  }),
});
