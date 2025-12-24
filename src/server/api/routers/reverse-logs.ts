import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// Status enum matching database
const reverseLogStatusEnum = z.enum(["SUCCESS", "FAILED", "PENDING"]);

// JSONB schemas
const reverseResultSchema = z.object({
  genre: z.string().optional(),
  tone: z.string().optional(),
  structure: z.string().optional(),
  vocabulary: z.array(z.string()).optional(),
}).passthrough().optional();

const metricsSchema = z.object({
  burstiness: z.number().optional(),
  ttr: z.number().optional(),
  avgSentLen: z.number().optional(),
}).optional();

// Input validation schemas
const getAllInputSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  genreCategory: z.string().optional(),
  status: reverseLogStatusEnum.optional(),
  search: z.string().optional(),
});

const createInputSchema = z.object({
  userId: z.string(),
  articleTitle: z.string().optional(),
  articleUrl: z.string().optional(),
  originalContent: z.string().optional(),
  genreCategory: z.string().optional(),
  // Raw data - complete n8n response before parsing
  rawData: z.record(z.unknown()).optional(),
  // JSONB fields (parsed from rawData or provided directly)
  reverseResult: reverseResultSchema,
  metrics: metricsSchema,
  // Legacy support - will be converted to JSONB in service
  reverseResultJson: z.string().optional(),
  metricBurstiness: z.number().optional(),
  metricTtr: z.number().optional(),
  metricAvgSentLen: z.number().optional(),
  // Other fields
  finalSystemPrompt: z.string().optional(),
  modelName: z.string().optional(),
  totalTokens: z.number().optional(),
  costEstimatedUsd: z.number().optional(),
  n8nExecutionId: z.string().optional(),
  status: reverseLogStatusEnum.optional(),
});

const idSchema = z.object({ id: z.string() });

const batchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1),
});

const exportSchema = z.object({
  ids: z.array(z.string()).optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

// Domain method input schemas
const userStyleProfileSchema = z.object({
  userId: z.string(),
});

const promptSuggestionsSchema = z.object({
  genreCategory: z.string(),
  limit: z.number().min(1).max(20).default(5),
});

const metricsTrendSchema = z.object({
  userId: z.string(),
  days: z.number().min(1).max(365).default(30),
});

const similarArticlesSchema = z.object({
  articleId: z.string(),
  limit: z.number().min(1).max(20).default(5),
});

const topPromptsSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
});

const genreInsightsSchema = z.object({
  genreCategory: z.string(),
});

const statisticsSchema = z.object({
  userId: z.string().optional(),
});

// Router definition - delegates to service layer
export const reverseLogsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getAllInputSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getAll(input)),

  getById: protectedProcedure
    .input(idSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getById(input.id)),

  // Public endpoint for n8n webhook callbacks
  create: publicProcedure
    .input(createInputSchema)
    .mutation(({ ctx, input }) => ctx.services.reverseLog.create(input)),

  delete: protectedProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => ctx.services.reverseLog.delete(input.id)),

  batchDelete: protectedProcedure
    .input(batchDeleteSchema)
    .mutation(({ ctx, input }) => ctx.services.reverseLog.batchDelete(input.ids)),

  getGenreCategories: protectedProcedure
    .query(({ ctx }) => ctx.services.reverseLog.getGenreCategories()),

  export: protectedProcedure
    .input(exportSchema)
    .query(async ({ ctx, input }) => {
      const logs = await ctx.services.reverseLog.export(input.ids);

      if (input.format === "csv") {
        // Convert to CSV format
        const headers = [
          "id",
          "userId",
          "articleTitle",
          "articleUrl",
          "genreCategory",
          "metricBurstiness",
          "metricTtr",
          "metricAvgSentLen",
          "modelName",
          "totalTokens",
          "costEstimatedUsd",
          "status",
          "createdAt",
        ];

        const rows = logs.map((log) => {
          // Extract metrics from JSONB
          const metrics = log.metrics as { burstiness?: number; ttr?: number; avgSentLen?: number } | null;
          return [
            log.id,
            log.userId,
            log.articleTitle ?? "",
            log.articleUrl ?? "",
            log.genreCategory ?? "",
            metrics?.burstiness?.toString() ?? "",
            metrics?.ttr?.toString() ?? "",
            metrics?.avgSentLen?.toString() ?? "",
            log.modelName ?? "",
            log.totalTokens?.toString() ?? "",
            log.costEstimatedUsd?.toString() ?? "",
            log.status ?? "",
            log.createdAt?.toISOString() ?? "",
          ];
        });

        const csvContent = [
          headers.join(","),
          ...rows.map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
          ),
        ].join("\n");

        return { format: "csv" as const, data: csvContent };
      }

      return { format: "json" as const, data: logs };
    }),

  // ==================== Domain Methods ====================

  /** 获取用户写作风格画像 */
  getUserStyleProfile: protectedProcedure
    .input(userStyleProfileSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getUserStyleProfile(input.userId)),

  /** 获取当前用户的写作风格画像 */
  getMyStyleProfile: protectedProcedure
    .query(({ ctx }) => ctx.services.reverseLog.getUserStyleProfile(ctx.user.id)),

  /** 获取特定文体的 Prompt 建议 */
  getPromptSuggestions: protectedProcedure
    .input(promptSuggestionsSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getPromptSuggestions(input.genreCategory, input.limit)),

  /** 获取用户指标趋势 */
  getMetricsTrend: protectedProcedure
    .input(metricsTrendSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getMetricsTrend(input.userId, input.days)),

  /** 获取当前用户指标趋势 */
  getMyMetricsTrend: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(({ ctx, input }) => ctx.services.reverseLog.getMetricsTrend(ctx.user.id, input.days)),

  /** 查找相似文章 */
  findSimilarArticles: protectedProcedure
    .input(similarArticlesSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.findSimilarArticles(input.articleId, input.limit)),

  /** 获取高质量 Prompt 排行 */
  getTopPrompts: protectedProcedure
    .input(topPromptsSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getTopPrompts(input.limit)),

  /** 获取文体分析洞察 */
  getGenreInsights: protectedProcedure
    .input(genreInsightsSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getGenreInsights(input.genreCategory)),

  /** 获取统计信息 */
  getStatistics: protectedProcedure
    .input(statisticsSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getStatistics(input.userId)),

  /** 获取当前用户统计信息 */
  getMyStatistics: protectedProcedure
    .query(({ ctx }) => ctx.services.reverseLog.getStatistics(ctx.user.id)),
});
