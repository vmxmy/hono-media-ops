import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const imagePromptAnalyticsRouter = createTRPCRouter({
  // Overview Statistics
  getOverview: protectedProcedure.query(({ ctx }) =>
    ctx.services.imagePromptAnalytics.getOverview(ctx.session!.user!.id!)
  ),

  getUsageTrend: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(({ ctx, input }) =>
      ctx.services.imagePromptAnalytics.getUsageTrend(ctx.session!.user!.id!, input.days)
    ),

  // Category Analytics
  getCategoryDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.imagePromptAnalytics.getCategoryDistribution(ctx.session!.user!.id!)
  ),

  getCategoryUsage: protectedProcedure.query(({ ctx }) =>
    ctx.services.imagePromptAnalytics.getCategoryUsage(ctx.session!.user!.id!)
  ),

  // Parameter Analytics
  getModelDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.imagePromptAnalytics.getModelDistribution(ctx.session!.user!.id!)
  ),

  getRatioDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.imagePromptAnalytics.getRatioDistribution(ctx.session!.user!.id!)
  ),

  getResolutionDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.imagePromptAnalytics.getResolutionDistribution(ctx.session!.user!.id!)
  ),

  // Quality Analytics
  getRatingDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.imagePromptAnalytics.getRatingDistribution(ctx.session!.user!.id!)
  ),

  getTopRatedPrompts: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(10) }))
    .query(({ ctx, input }) =>
      ctx.services.imagePromptAnalytics.getTopRatedPrompts(ctx.session!.user!.id!, input.limit)
    ),

  // Source Analytics
  getSourceDistribution: protectedProcedure.query(({ ctx }) =>
    ctx.services.imagePromptAnalytics.getSourceDistribution(ctx.session!.user!.id!)
  ),

  // Creation Analytics
  getCreationTrend: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(({ ctx, input }) =>
      ctx.services.imagePromptAnalytics.getCreationTrend(ctx.session!.user!.id!, input.days)
    ),

  // Tag Analytics
  getTopTags: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(({ ctx, input }) =>
      ctx.services.imagePromptAnalytics.getTopTags(ctx.session!.user!.id!, input.limit)
    ),
});
