import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const embeddingAnalyticsRouter = createTRPCRouter({
  getOverview: protectedProcedure.query(({ ctx }) =>
    ctx.services.embeddingAnalytics.getOverview(ctx.session!.user!.id!)
  ),

  getModelVersionDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.embeddingAnalytics.getModelVersionDistribution(ctx.session!.user!.id!)
  ),

  getCreationTrend: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(({ ctx, input }) =>
      ctx.services.embeddingAnalytics.getCreationTrend(ctx.session!.user!.id!, input.days)
    ),

  getTaskEmbeddingStatus: protectedProcedure.query(({ ctx }) =>
    ctx.services.embeddingAnalytics.getTaskEmbeddingStatus(ctx.session!.user!.id!)
  ),

  getContentHashAnalysis: protectedProcedure.query(({ ctx }) =>
    ctx.services.embeddingAnalytics.getContentHashAnalysis(ctx.session!.user!.id!)
  ),

  getEmbeddingAge: protectedProcedure.query(({ ctx }) =>
    ctx.services.embeddingAnalytics.getEmbeddingAge(ctx.session!.user!.id!)
  ),

  getRecentEmbeddings: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(({ ctx, input }) =>
      ctx.services.embeddingAnalytics.getRecentEmbeddings(ctx.session!.user!.id!, input.limit)
    ),

  getGrowthRate: protectedProcedure.query(({ ctx }) =>
    ctx.services.embeddingAnalytics.getGrowthRate(ctx.session!.user!.id!)
  ),
});
