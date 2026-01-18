import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const wechatArticleAnalyticsRouter = createTRPCRouter({
  getOverview: publicProcedure.query(({ ctx }) =>
    ctx.services.wechatArticleAnalytics.getOverview()
  ),

  getAccountDistribution: publicProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(({ ctx, input }) =>
      ctx.services.wechatArticleAnalytics.getAccountDistribution(input.limit)
    ),

  getAuthorDistribution: publicProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(({ ctx, input }) =>
      ctx.services.wechatArticleAnalytics.getAuthorDistribution(input.limit)
    ),

  getImportTrend: publicProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(({ ctx, input }) =>
      ctx.services.wechatArticleAnalytics.getImportTrend(input.days)
    ),

  getPublishTrend: publicProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(({ ctx, input }) =>
      ctx.services.wechatArticleAnalytics.getPublishTrend(input.days)
    ),

  getAdAnalysis: publicProcedure.query(({ ctx }) =>
    ctx.services.wechatArticleAnalytics.getAdAnalysis()
  ),

  getCoverAnalysis: publicProcedure.query(({ ctx }) =>
    ctx.services.wechatArticleAnalytics.getCoverAnalysis()
  ),

  getTimeDistribution: publicProcedure.query(({ ctx }) =>
    ctx.services.wechatArticleAnalytics.getTimeDistribution()
  ),

  getTopArticles: publicProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(({ ctx, input }) =>
      ctx.services.wechatArticleAnalytics.getTopArticles(input.limit)
    ),

  getAccountStats: publicProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(({ ctx, input }) =>
      ctx.services.wechatArticleAnalytics.getAccountStats(input.limit)
    ),
});
