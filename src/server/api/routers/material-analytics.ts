import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const materialAnalyticsRouter = createTRPCRouter({
  // Overview Statistics
  getOverview: protectedProcedure.query(({ ctx }) =>
    ctx.services.materialAnalytics.getOverview(ctx.session!.user!.id!)
  ),

  getGrowthTrend: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(({ ctx, input }) =>
      ctx.services.materialAnalytics.getGrowthTrend(ctx.session!.user!.id!, input.days)
    ),

  getUsageStats: protectedProcedure.query(({ ctx }) =>
    ctx.services.materialAnalytics.getUsageStats(ctx.session!.user!.id!)
  ),

  getQualityMetrics: protectedProcedure.query(({ ctx }) =>
    ctx.services.materialAnalytics.getQualityMetrics(ctx.session!.user!.id!)
  ),

  getStatusDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.materialAnalytics.getStatusDistribution(ctx.session!.user!.id!)
  ),

  getCreationTrend: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(({ ctx, input }) =>
      ctx.services.materialAnalytics.getCreationTrend(ctx.session!.user!.id!, input.days)
    ),

  // Quality Analysis
  getWordCountDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.materialAnalytics.getWordCountDistribution(ctx.session!.user!.id!)
  ),

  getMetricsScatter: protectedProcedure.query(({ ctx }) =>
    ctx.services.materialAnalytics.getMetricsScatter(ctx.session!.user!.id!)
  ),

  getParaCountDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.materialAnalytics.getParaCountDistribution(ctx.session!.user!.id!)
  ),

  getSentLenDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.materialAnalytics.getSentLenDistribution(ctx.session!.user!.id!)
  ),

  getMaterialsWithQualityScores: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(100) }))
    .query(({ ctx, input }) =>
      ctx.services.materialAnalytics.getMaterialsWithQualityScores(ctx.session!.user!.id!, input.limit)
    ),

  // Category Analysis
  getTypeDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.materialAnalytics.getTypeDistribution(ctx.session!.user!.id!)
  ),

  getTypeTrend: protectedProcedure
    .input(z.object({ days: z.number().optional().default(90) }))
    .query(({ ctx, input }) =>
      ctx.services.materialAnalytics.getTypeTrend(ctx.session!.user!.id!, input.days)
    ),

  // Usage Analysis
  getTopUsedMaterials: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(({ ctx, input }) =>
      ctx.services.materialAnalytics.getTopUsedMaterials(ctx.session!.user!.id!, input.limit)
    ),
});

