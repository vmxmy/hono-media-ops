import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const xhsAnalyticsRouter = createTRPCRouter({
  getOverview: protectedProcedure.query(({ ctx }) =>
    ctx.services.xhsAnalytics.getOverview(ctx.session!.user!.id!)
  ),

  getStatusDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.xhsAnalytics.getStatusDistribution(ctx.session!.user!.id!)
  ),

  getCreationTrend: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(({ ctx, input }) =>
      ctx.services.xhsAnalytics.getCreationTrend(ctx.session!.user!.id!, input.days)
    ),

  getCompletionTrend: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(({ ctx, input }) =>
      ctx.services.xhsAnalytics.getCompletionTrend(ctx.session!.user!.id!, input.days)
    ),

  getImageTypeDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.xhsAnalytics.getImageTypeDistribution(ctx.session!.user!.id!)
  ),

  getRatioDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.xhsAnalytics.getRatioDistribution(ctx.session!.user!.id!)
  ),

  getResolutionDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.xhsAnalytics.getResolutionDistribution(ctx.session!.user!.id!)
  ),

  getCompletionAnalysis: protectedProcedure.query(({ ctx }) =>
    ctx.services.xhsAnalytics.getCompletionAnalysis(ctx.session!.user!.id!)
  ),

  getTopSources: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(10) }))
    .query(({ ctx, input }) =>
      ctx.services.xhsAnalytics.getTopSources(ctx.session!.user!.id!, input.limit)
    ),

  getPerformanceMetrics: protectedProcedure.query(({ ctx }) =>
    ctx.services.xhsAnalytics.getPerformanceMetrics(ctx.session!.user!.id!)
  ),
});
