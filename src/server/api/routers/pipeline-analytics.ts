import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const pipelineAnalyticsRouter = createTRPCRouter({
  getOverview: protectedProcedure.query(({ ctx }) =>
    ctx.services.pipelineAnalytics.getOverview(ctx.session!.user!.id!)
  ),

  getStatusDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.pipelineAnalytics.getStatusDistribution(ctx.session!.user!.id!)
  ),

  getCreationTrend: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(({ ctx, input }) =>
      ctx.services.pipelineAnalytics.getCreationTrend(ctx.session!.user!.id!, input.days)
    ),

  getCompletionTrend: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(({ ctx, input }) =>
      ctx.services.pipelineAnalytics.getCompletionTrend(ctx.session!.user!.id!, input.days)
    ),

  getProgressAnalysis: protectedProcedure.query(({ ctx }) =>
    ctx.services.pipelineAnalytics.getProgressAnalysis(ctx.session!.user!.id!)
  ),

  getTopSources: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(10) }))
    .query(({ ctx, input }) =>
      ctx.services.pipelineAnalytics.getTopSources(ctx.session!.user!.id!, input.limit)
    ),

  getTopTopics: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(10) }))
    .query(({ ctx, input }) =>
      ctx.services.pipelineAnalytics.getTopTopics(ctx.session!.user!.id!, input.limit)
    ),

  getTopKeywords: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(({ ctx, input }) =>
      ctx.services.pipelineAnalytics.getTopKeywords(ctx.session!.user!.id!, input.limit)
    ),

  getPerformanceMetrics: protectedProcedure.query(({ ctx }) =>
    ctx.services.pipelineAnalytics.getPerformanceMetrics(ctx.session!.user!.id!)
  ),
});
