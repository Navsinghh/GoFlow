import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createVersion, getVersion, listVersions } from "@/server/flows";
import { requireFlow } from "../access";
import { protectedProcedure, router } from "../init";

const flowId = z.object({ flowId: z.string().min(1) });

export const versionRouter = router({
  list: protectedProcedure.input(flowId).query(async ({ ctx, input }) => {
    await requireFlow(ctx.db, ctx.user, input.flowId, "viewer");
    return listVersions(ctx.db, input.flowId);
  }),

  create: protectedProcedure
    .input(flowId.extend({ label: z.string().trim().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      await requireFlow(ctx.db, ctx.user, input.flowId, "editor");
      const id = await createVersion(ctx.db, { flowId: input.flowId, label: input.label, userId: ctx.user.id });
      if (!id) throw new TRPCError({ code: "BAD_REQUEST", message: "Nothing to save yet" });
      await ctx.logActivity(input.flowId, "version.saved", { label: input.label });
      return { id };
    }),

  /** Encoded Yjs state of a version, which the editor applies to restore it. */
  get: protectedProcedure.input(flowId.extend({ versionId: z.string() })).query(async ({ ctx, input }) => {
    await requireFlow(ctx.db, ctx.user, input.flowId, "editor");
    const version = await getVersion(ctx.db, input.flowId, input.versionId);
    if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
    return { state: Buffer.from(version.doc).toString("base64") };
  }),

  /** Restoring happens in the live document on the client; this records it in the timeline. */
  markRestored: protectedProcedure.input(flowId.extend({ versionId: z.string() })).mutation(async ({ ctx, input }) => {
    await requireFlow(ctx.db, ctx.user, input.flowId, "editor");
    const version = await getVersion(ctx.db, input.flowId, input.versionId);
    if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
    await ctx.logActivity(input.flowId, "version.restored", { label: version.label ?? "an auto-save" });
  }),
});
