import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const taskAnalyticsRouter = createTRPCRouter({
  getOverview: protectedProcedure.query(({ ctx }) =>
    ctx.services.taskAnalytics.getOverview(ctx.session!.user!.id!)
  ),

  getStatusDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.taskAnalytics.getStatusDistribution(ctx.session!.user!.id!)
  ),

  getCreationTrend: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(({ ctx, input }) =>
      ctx.services.taskAnalytics.getCreationTrend(ctx.session!.user!.id!, input.days)
    ),

  getCompletionTrend: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(({ ctx, input }) =>
      ctx.services.taskAnalytics.getCompletionTrend(ctx.session!.user!.id!, input.days)
    ),

  getWordCountDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.taskAnalytics.getWordCountDistribution(ctx.session!.user!.id!)
  ),

  getProgressAnalysis: protectedProcedure.query(({ ctx }) =>
    ctx.services.taskAnalytics.getProgressAnalysis(ctx.session!.user!.id!)
  ),

  getReferenceUsage: protectedProcedure.query(({ ctx }) =>
    ctx.services.taskAnalytics.getReferenceUsage(ctx.session!.user!.id!)
  ),

  getExecutionStats: protectedProcedure.query(({ ctx }) =>
    ctx.services.taskAnalytics.getExecutionStats(ctx.session!.user!.id!)
  ),

  getTopTopics: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(10) }))
    .query(({ ctx, input }) =>
      ctx.services.taskAnalytics.getTopTopics(ctx.session!.user!.id!, input.limit)
    ),

  getTopKeywords: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(({ ctx, input }) =>
      ctx.services.taskAnalytics.getTopKeywords(ctx.session!.user!.id!, input.limit)
    ),
});
