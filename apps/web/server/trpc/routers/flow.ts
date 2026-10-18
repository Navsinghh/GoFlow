import { z } from "zod";
import { createFlow, duplicateFlow, listFlows, renameFlow, setFlowDeleted } from "@/server/flows";
import { ensurePersonalWorkspace } from "@/server/workspaces";
import { requireFlow } from "../access";
import { protectedProcedure, router } from "../init";

export const flowId = z.object({ id: z.string().min(1) });
const title = z.string().trim().min(1).max(120);

export const flowRouter = router({
  list: protectedProcedure.query(({ ctx }) => listFlows(ctx.db, ctx.user)),

  get: protectedProcedure.input(flowId).query(({ ctx, input }) => requireFlow(ctx.db, ctx.user, input.id, "viewer")),

  create: protectedProcedure
    .input(z.object({ title: title.optional(), mode: z.enum(["workflow", "diagram"]) }))
    .mutation(async ({ ctx, input }) => {
      const workspaceId = await ensurePersonalWorkspace(ctx.db, ctx.user);
      const title = input.title ?? (input.mode === "workflow" ? "Untitled workflow" : "Untitled diagram");
      const id = await createFlow(ctx.db, { workspaceId, userId: ctx.user.id, mode: input.mode, title });
      await ctx.logActivity(id, "flow.created", { title });
      return { id };
    }),

  rename: protectedProcedure.input(flowId.extend({ title })).mutation(async ({ ctx, input }) => {
    const found = await requireFlow(ctx.db, ctx.user, input.id, "editor");
    if (found.title === input.title) return;
    await renameFlow(ctx.db, input.id, input.title);
    await ctx.logActivity(input.id, "flow.renamed", { from: found.title, to: input.title });
  }),

  /** Anyone who can view a flow can copy it into their own workspace. */
  duplicate: protectedProcedure.input(flowId).mutation(async ({ ctx, input }) => {
    await requireFlow(ctx.db, ctx.user, input.id, "viewer");
    const workspaceId = await ensurePersonalWorkspace(ctx.db, ctx.user);
    return { id: (await duplicateFlow(ctx.db, input.id, ctx.user.id, workspaceId))! };
  }),

  delete: protectedProcedure.input(flowId).mutation(async ({ ctx, input }) => {
    await requireFlow(ctx.db, ctx.user, input.id, "owner");
    await setFlowDeleted(ctx.db, input.id, true);
    await ctx.logActivity(input.id, "flow.deleted", {});
  }),

  restore: protectedProcedure.input(flowId).mutation(async ({ ctx, input }) => {
    await requireFlow(ctx.db, ctx.user, input.id, "owner", { includeDeleted: true });
    await setFlowDeleted(ctx.db, input.id, false);
    await ctx.logActivity(input.id, "flow.restored", {});
  }),
});
