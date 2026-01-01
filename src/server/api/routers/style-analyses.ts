import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// ==================== JSONB Schemas for v7.3 ====================

// StyleIdentityData JSONB schema
const styleIdentityDataSchema = z.object({
  persona_description: z.string().optional(),
  voice_traits: z.object({
    formality: z.string().optional(),
    energy: z.string().optional(),
    warmth: z.string().optional(),
    confidence: z.string().optional(),
  }).optional(),
  style_name: z.string().optional(),
  archetype: z.string().optional(),
  implied_reader: z.string().optional(),
}).passthrough().optional();

// MetricsConstraintsData JSONB schema
const metricsConstraintsDataSchema = z.object({
  avg_sentence_length: z.number().optional(),
  sentence_length_std: z.number().optional(),
  sentence_length_target: z.number().optional(),
  avg_paragraph_length: z.number().optional(),
  punctuation_rules: z.record(z.unknown()).optional(),
  rhythm_rules: z.record(z.unknown()).optional(),
}).passthrough().optional();

// LexicalLogicData JSONB schema
const lexicalLogicDataSchema = z.object({
  vocabulary_tier: z.string().optional(),
  preferred_terms: z.array(z.string()).optional(),
  banned_terms: z.array(z.string()).optional(),
  tone_keywords: z.array(z.string()).optional(),
}).passthrough().optional();

// RhetoricLogicData JSONB schema
const rhetoricLogicDataSchema = z.object({
  preferred_devices: z.array(z.string()).optional(),
  device_frequency: z.record(z.unknown()).optional(),
  sentence_templates: z.array(z.record(z.unknown())).optional(),
}).passthrough().optional();

// GoldenSampleData JSONB schema
const goldenSampleDataSchema = z.object({
  samples: z.array(z.object({
    text: z.string().optional(),
    why: z.string().optional(),
  })).optional(),
}).passthrough().optional();

// TransferDemoData JSONB schema
const transferDemoDataSchema = z.object({
  before_after_pairs: z.array(z.object({
    before: z.string().optional(),
    after: z.string().optional(),
    explanation: z.string().optional(),
  })).optional(),
}).passthrough().optional();

// CoreRuleItem schema
const coreRuleItemSchema = z.object({
  rule_id: z.string().optional(),
  rule_text: z.string().optional(),
  importance: z.string().optional(),
  examples: z.array(z.string()).optional(),
  priority: z.number().optional(),
  feature: z.string().optional(),
  evidence: z.string().optional(),
  frequency: z.string().optional(),
  replication_instruction: z.string().optional(),
}).passthrough();

// BlueprintItem schema
const blueprintItemSchema = z.object({
  section: z.string().optional(),
  section_position: z.string().optional(),
  position: z.string().optional(),
  word_count_target: z.number().optional(),
  word_percentage: z.string().optional(),
  function: z.string().optional(),
  internal_logic: z.record(z.unknown()).optional(),
  techniques: z.array(z.record(z.unknown())).optional(),
  sentence_patterns: z.record(z.unknown()).optional(),
  do_list: z.array(z.string()).optional(),
  dont_list: z.array(z.string()).optional(),
}).passthrough();

// AntiPatternItem schema
const antiPatternItemSchema = z.object({
  pattern: z.string().optional(),
  severity: z.string().optional(),
  example: z.string().optional(),
  fix_suggestion: z.string().optional(),
}).passthrough();

// Status enum
const statusSchema = z.enum(["PENDING", "SUCCESS", "FAILED"]);

// ==================== Input Validation Schemas ====================

const getAllInputSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  primaryType: z.string().optional(),
  status: statusSchema.optional(),
});

const createInputSchema = z.object({
  userId: z.string(),
  // 基础识别
  sourceUrl: z.string().optional(),
  sourceTitle: z.string().optional(),
  styleName: z.string().optional(),
  primaryType: z.string().optional(),
  analysisVersion: z.string().optional(),
  executionPrompt: z.string().optional(),
  wordCount: z.number().optional(),
  paraCount: z.number().optional(),
  // 数值指标
  metricsBurstiness: z.number().optional(),
  metricsTtr: z.number().optional(),
  // 策略层 JSONB
  styleIdentityData: styleIdentityDataSchema,
  metricsConstraintsData: metricsConstraintsDataSchema,
  lexicalLogicData: lexicalLogicDataSchema,
  rhetoricLogicData: rhetoricLogicDataSchema,
  goldenSampleData: goldenSampleDataSchema,
  transferDemoData: transferDemoDataSchema,
  // 数组层 JSONB
  coreRulesData: z.array(coreRuleItemSchema).optional(),
  blueprintData: z.array(blueprintItemSchema).optional(),
  antiPatternsData: z.array(antiPatternItemSchema).optional(),
  // 备份
  rawJsonFull: z.record(z.unknown()).optional(),
  status: statusSchema.optional(),
});

const updateInputSchema = z.object({
  id: z.string(),
  sourceTitle: z.string().optional(),
  styleName: z.string().optional(),
  primaryType: z.string().optional(),
  analysisVersion: z.string().optional(),
  executionPrompt: z.string().optional(),
  styleIdentityData: styleIdentityDataSchema,
  metricsConstraintsData: metricsConstraintsDataSchema,
  lexicalLogicData: lexicalLogicDataSchema,
  rhetoricLogicData: rhetoricLogicDataSchema,
  goldenSampleData: goldenSampleDataSchema,
  transferDemoData: transferDemoDataSchema,
  coreRulesData: z.array(coreRuleItemSchema).optional(),
  blueprintData: z.array(blueprintItemSchema).optional(),
  antiPatternsData: z.array(antiPatternItemSchema).optional(),
  status: statusSchema.optional(),
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

const metricsTrendSchema = z.object({
  userId: z.string(),
  days: z.number().min(1).max(365).default(30),
});

const primaryTypeInsightsSchema = z.object({
  primaryType: z.string(),
});

const statisticsSchema = z.object({
  userId: z.string().optional(),
});

// ==================== Router Definition ====================

export const styleAnalysesRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getAllInputSchema)
    .query(({ ctx, input }) => ctx.services.styleAnalysis.getAll({
      ...input,
      userId: ctx.user.id, // Filter by current user
    })),

  getById: protectedProcedure
    .input(idSchema)
    .query(({ ctx, input }) => ctx.services.styleAnalysis.getById(input.id)),

  getBySourceUrl: protectedProcedure
    .input(z.object({ sourceUrl: z.string() }))
    .query(({ ctx, input }) => ctx.services.styleAnalysis.getBySourceUrl(input.sourceUrl)),

  // Public endpoint for n8n webhook callbacks
  create: publicProcedure
    .input(createInputSchema)
    .mutation(({ ctx, input }) => ctx.services.styleAnalysis.create(input)),

  // Public endpoint for n8n webhook callbacks (upsert by sourceUrl)
  upsert: publicProcedure
    .input(createInputSchema)
    .mutation(({ ctx, input }) => ctx.services.styleAnalysis.upsert(input)),

  update: protectedProcedure
    .input(updateInputSchema)
    .mutation(({ ctx, input }) => ctx.services.styleAnalysis.update(input)),

  delete: protectedProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => ctx.services.styleAnalysis.delete(input.id)),

  batchDelete: protectedProcedure
    .input(batchDeleteSchema)
    .mutation(({ ctx, input }) => ctx.services.styleAnalysis.batchDelete(input.ids)),

  getPrimaryTypes: protectedProcedure
    .query(({ ctx }) => ctx.services.styleAnalysis.getPrimaryTypes()),

  export: protectedProcedure
    .input(exportSchema)
    .query(async ({ ctx, input }) => {
      const analyses = await ctx.services.styleAnalysis.export(input.ids);

      if (input.format === "csv") {
        // Convert to CSV format for v7.3 schema
        const headers = [
          "id",
          "userId",
          "sourceTitle",
          "sourceUrl",
          "primaryType",
          "wordCount",
          "paraCount",
          "metricsBurstiness",
          "metricsTtr",
          "status",
          "createdAt",
        ];

        const rows = analyses.map((a) => [
          a.id,
          a.userId,
          a.sourceTitle ?? "",
          a.sourceUrl ?? "",
          a.primaryType ?? "",
          a.wordCount?.toString() ?? "",
          a.paraCount?.toString() ?? "",
          a.metricsBurstiness?.toString() ?? "",
          a.metricsTtr?.toString() ?? "",
          a.status,
          a.createdAt?.toISOString() ?? "",
        ]);

        const csvContent = [
          headers.join(","),
          ...rows.map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
          ),
        ].join("\n");

        return { format: "csv" as const, data: csvContent };
      }

      return { format: "json" as const, data: analyses };
    }),

  // ==================== Domain Methods ====================

  /** 获取用户写作风格画像 */
  getUserStyleProfile: protectedProcedure
    .input(userStyleProfileSchema)
    .query(({ ctx, input }) => ctx.services.styleAnalysis.getUserStyleProfile(input.userId)),

  /** 获取当前用户的写作风格画像 */
  getMyStyleProfile: protectedProcedure
    .query(({ ctx }) => ctx.services.styleAnalysis.getUserStyleProfile(ctx.user.id)),

  /** 获取用户指标趋势 */
  getMetricsTrend: protectedProcedure
    .input(metricsTrendSchema)
    .query(({ ctx, input }) => ctx.services.styleAnalysis.getMetricsTrend(input.userId, input.days)),

  /** 获取当前用户指标趋势 */
  getMyMetricsTrend: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(({ ctx, input }) => ctx.services.styleAnalysis.getMetricsTrend(ctx.user.id, input.days)),

  /** 获取类型分析洞察 */
  getPrimaryTypeInsights: protectedProcedure
    .input(primaryTypeInsightsSchema)
    .query(({ ctx, input }) => ctx.services.styleAnalysis.getPrimaryTypeInsights(input.primaryType)),

  /** 获取统计信息 */
  getStatistics: protectedProcedure
    .input(statisticsSchema)
    .query(({ ctx, input }) => ctx.services.styleAnalysis.getStatistics(input.userId)),

  /** 获取当前用户统计信息 */
  getMyStatistics: protectedProcedure
    .query(({ ctx }) => ctx.services.styleAnalysis.getStatistics(ctx.user.id)),

  // ==================== Execution Prompt Generation ====================

  /** 获取记录并附带动态生成的 execution_prompt */
  getByIdWithExecutionPrompt: protectedProcedure
    .input(idSchema)
    .query(({ ctx, input }) => ctx.services.styleAnalysis.getByIdWithExecutionPrompt(input.id)),

  /** 从记录动态生成 execution_prompt（仅返回 prompt 文本） */
  generateExecutionPrompt: protectedProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      const analysis = await ctx.services.styleAnalysis.getById(input.id);
      if (!analysis) return null;
      return {
        id: analysis.id,
        executionPrompt: ctx.services.styleAnalysis.generateExecutionPromptFromRecord(analysis),
      };
    }),

  // ==================== Embedding & Vector Search ====================

  /** 混合搜索 (关键词 + 向量) */
  hybridSearch: protectedProcedure
    .input(getAllInputSchema.extend({ useVectorSearch: z.boolean().default(true) }))
    .query(({ ctx, input }) => ctx.services.styleAnalysis.hybridSearch({
      ...input,
      userId: ctx.user.id,
    })),

  /** 为单个素材生成 embedding */
  generateEmbedding: protectedProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => ctx.services.styleAnalysis.generateAndStoreEmbedding(input.id)),

  /** 批量生成缺失的 embeddings */
  generateMissingEmbeddings: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .mutation(({ ctx, input }) => ctx.services.styleAnalysis.generateMissingEmbeddings(input.limit)),

  /** 获取 embedding 统计 */
  getEmbeddingStats: protectedProcedure
    .query(({ ctx }) => ctx.services.styleAnalysis.getEmbeddingStats()),
});

// Backwards compatibility - export as reverseLogsRouter
export { styleAnalysesRouter as reverseLogsRouter };
