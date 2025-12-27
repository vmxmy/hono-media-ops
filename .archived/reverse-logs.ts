import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// StyleBlueprint JSONB schema (passthrough for complex nested structure)
const styleBlueprintSchema = z.object({
  meta: z.record(z.unknown()).optional(),
  style_name: z.string().optional(),
  category: z.string().optional(),
  style_fingerprint: z.array(z.record(z.unknown())).optional(),
  minimum_viable_replication: z.record(z.unknown()).optional(),
  style_stability: z.record(z.unknown()).optional(),
  meta_profile: z.record(z.unknown()).optional(),
  deep_analysis: z.record(z.unknown()).optional(),
  type_specific_profile: z.record(z.unknown()).optional(),
  blueprint: z.array(z.record(z.unknown())).optional(),
  style_enforcement: z.record(z.unknown()).optional(),
  sentence_templates: z.array(z.record(z.unknown())).optional(),
  voice_demonstration: z.array(z.record(z.unknown())).optional(),
  transformation_examples: z.array(z.record(z.unknown())).optional(),
  anti_patterns: z.array(z.record(z.unknown())).optional(),
  validation_checklist: z.array(z.record(z.unknown())).optional(),
}).passthrough().optional();

// Metadata JSONB schema
const metadataSchema = z.object({
  parse_success: z.boolean().optional(),
  parse_error: z.string().nullable().optional(),
  raw_length: z.number().optional(),
}).optional();

// Input validation schemas
const getAllInputSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  category: z.string().optional(),
  styleName: z.string().optional(),
  search: z.string().optional(),
});

const createInputSchema = z.object({
  userId: z.string(),
  inputContent: z.string().optional(),
  title: z.string().optional(),
  contentText: z.string().optional(),
  // Metrics
  metricsBurstiness: z.number().optional(),
  metricsTtr: z.number().optional(),
  metricsAvgSentLen: z.number().optional(),
  metricsAvgParaLen: z.number().optional(),
  metricsWordCount: z.number().optional(),
  metricsSentenceCount: z.number().optional(),
  metricsParagraphCount: z.number().optional(),
  // Style blueprint (consolidated JSONB)
  styleBlueprint: styleBlueprintSchema,
  // Execution prompt
  executionPrompt: z.string().optional(),
  // Parse metadata
  metadata: metadataSchema,
});

const updateInputSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  styleBlueprint: styleBlueprintSchema,
  executionPrompt: z.string().optional(),
  metadata: metadataSchema,
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
  category: z.string(),
  limit: z.number().min(1).max(20).default(5),
});

const metricsTrendSchema = z.object({
  userId: z.string(),
  days: z.number().min(1).max(365).default(30),
});

const topPromptsSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
});

const categoryInsightsSchema = z.object({
  category: z.string(),
});

const statisticsSchema = z.object({
  userId: z.string().optional(),
});

// Router definition - delegates to service layer
export const reverseLogsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getAllInputSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getAll({
      ...input,
      userId: ctx.user.id, // Filter by current user
    })),

  getById: protectedProcedure
    .input(idSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getById(input.id)),

  getByInputContent: protectedProcedure
    .input(z.object({ inputContent: z.string() }))
    .query(({ ctx, input }) => ctx.services.reverseLog.getByInputContent(input.inputContent)),

  // Public endpoint for n8n webhook callbacks
  create: publicProcedure
    .input(createInputSchema)
    .mutation(({ ctx, input }) => ctx.services.reverseLog.create(input)),

  // Public endpoint for n8n webhook callbacks (upsert by inputContent)
  upsert: publicProcedure
    .input(createInputSchema)
    .mutation(({ ctx, input }) => ctx.services.reverseLog.upsert(input)),

  update: protectedProcedure
    .input(updateInputSchema)
    .mutation(({ ctx, input }) => ctx.services.reverseLog.update(input)),

  delete: protectedProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => ctx.services.reverseLog.delete(input.id)),

  batchDelete: protectedProcedure
    .input(batchDeleteSchema)
    .mutation(({ ctx, input }) => ctx.services.reverseLog.batchDelete(input.ids)),

  getCategories: protectedProcedure
    .query(({ ctx }) => ctx.services.reverseLog.getCategories()),

  getStyleNames: protectedProcedure
    .query(({ ctx }) => ctx.services.reverseLog.getStyleNames()),

  export: protectedProcedure
    .input(exportSchema)
    .query(async ({ ctx, input }) => {
      const logs = await ctx.services.reverseLog.export(input.ids);

      if (input.format === "csv") {
        // Convert to CSV format
        const headers = [
          "id",
          "userId",
          "title",
          "inputContent",
          "category",
          "styleName",
          "metricsBurstiness",
          "metricsTtr",
          "metricsAvgSentLen",
          "metricsAvgParaLen",
          "metricsWordCount",
          "metricsSentenceCount",
          "metricsParagraphCount",
          "createdAt",
        ];

        const rows = logs.map((log) => {
          // Extract category and styleName from styleBlueprint
          const blueprint = log.styleBlueprint as Record<string, unknown> | null;
          const category = blueprint?.category as string | undefined;
          const styleName = blueprint?.style_name as string | undefined;

          return [
            log.id,
            log.userId,
            log.title ?? "",
            log.inputContent ?? "",
            category ?? "",
            styleName ?? "",
            log.metricsBurstiness?.toString() ?? "",
            log.metricsTtr?.toString() ?? "",
            log.metricsAvgSentLen?.toString() ?? "",
            log.metricsAvgParaLen?.toString() ?? "",
            log.metricsWordCount?.toString() ?? "",
            log.metricsSentenceCount?.toString() ?? "",
            log.metricsParagraphCount?.toString() ?? "",
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

  /** 获取特定分类的 Prompt 建议 */
  getPromptSuggestions: protectedProcedure
    .input(promptSuggestionsSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getPromptSuggestions(input.category, input.limit)),

  /** 获取用户指标趋势 */
  getMetricsTrend: protectedProcedure
    .input(metricsTrendSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getMetricsTrend(input.userId, input.days)),

  /** 获取当前用户指标趋势 */
  getMyMetricsTrend: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(({ ctx, input }) => ctx.services.reverseLog.getMetricsTrend(ctx.user.id, input.days)),

  /** 获取高质量 Prompt 排行 */
  getTopPrompts: protectedProcedure
    .input(topPromptsSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getTopPrompts(input.limit)),

  /** 获取分类分析洞察 */
  getCategoryInsights: protectedProcedure
    .input(categoryInsightsSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getCategoryInsights(input.category)),

  /** 获取统计信息 */
  getStatistics: protectedProcedure
    .input(statisticsSchema)
    .query(({ ctx, input }) => ctx.services.reverseLog.getStatistics(input.userId)),

  /** 获取当前用户统计信息 */
  getMyStatistics: protectedProcedure
    .query(({ ctx }) => ctx.services.reverseLog.getStatistics(ctx.user.id)),
});
