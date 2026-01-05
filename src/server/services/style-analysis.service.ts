import { eq, desc, like, and, or, sql, inArray, gte, isNull } from "drizzle-orm";
import { createHash } from "crypto";
import OpenAI from "openai";
import { db } from "@/server/db";
import {
  styleAnalyses,
  type StyleAnalysis,
  type StyleIdentityData,
  type MetricsConstraintsData,
  type LexicalLogicData,
  type RhetoricLogicData,
  type GoldenSampleData,
  type TransferDemoData,
  type CoreRuleItem,
  type BlueprintItem,
  type AntiPatternItem,
} from "@/server/db/schema";
import { generateExecutionPrompt, generateExecutionPromptPreview } from "@/lib/style-analysis";

// ==================== Embedding Config (from env) ====================

const getEmbeddingConfig = () => ({
  apiUrl: process.env.EMBEDDING_API_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.EMBEDDING_API_KEY ?? "",
  model: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
});

const EMBEDDING_DIMENSIONS = 1024;
const MAX_CONTENT_LENGTH = 8000; // ~2000 tokens for Chinese

// ==================== Types ====================

export interface GetAllStyleAnalysesOptions {
  page: number;
  pageSize: number;
  search?: string;
  primaryType?: string;
  status?: string;
  userId?: string;
}

export interface CreateStyleAnalysisInput {
  userId: string;
  // 基础识别
  sourceUrl?: string;
  sourceTitle?: string;
  styleName?: string;
  primaryType?: string;
  analysisVersion?: string;
  executionPrompt?: string;
  wordCount?: number;
  paraCount?: number;
  // 数值指标
  metricsBurstiness?: number;
  metricsTtr?: number;
  metricsAvgSentLen?: number;
  // 策略层 JSONB
  styleIdentity?: StyleIdentityData;
  metricsConstraints?: MetricsConstraintsData;
  lexicalLogic?: LexicalLogicData;
  rhetoricLogic?: RhetoricLogicData;
  goldenSample?: GoldenSampleData;
  transferDemo?: TransferDemoData;
  // 数组层 JSONB
  coreRules?: CoreRuleItem[];
  blueprint?: BlueprintItem[];
  antiPatterns?: AntiPatternItem[];
  // 备份
  rawJsonFull?: Record<string, unknown>;
  // 解析元数据
  metadata?: Record<string, unknown>;
  status?: "PENDING" | "SUCCESS" | "FAILED";
}

export interface UpdateStyleAnalysisInput {
  id: string;
  sourceTitle?: string;
  styleName?: string;
  primaryType?: string;
  analysisVersion?: string;
  executionPrompt?: string;
  styleIdentity?: StyleIdentityData;
  metricsConstraints?: MetricsConstraintsData;
  lexicalLogic?: LexicalLogicData;
  rhetoricLogic?: RhetoricLogicData;
  goldenSample?: GoldenSampleData;
  transferDemo?: TransferDemoData;
  coreRules?: CoreRuleItem[];
  blueprint?: BlueprintItem[];
  antiPatterns?: AntiPatternItem[];
  status?: "PENDING" | "SUCCESS" | "FAILED";
}

/** 用户写作风格画像 */
export interface UserStyleProfile {
  userId: string;
  totalAnalyses: number;
  /** 最常用的文章类型及占比 */
  topPrimaryTypes: Array<{ primaryType: string; count: number; percentage: number }>;
  /** 平均指标 */
  averageMetrics: {
    wordCount: number | null;
    paraCount: number | null;
    burstiness: number | null;
    ttr: number | null;
  };
  /** 常用语气关键词 */
  commonToneKeywords: string[];
  /** 最近分析时间 */
  lastAnalysisAt: Date | null;
}

/** 指标趋势数据点 */
export interface MetricsTrendPoint {
  date: string;
  wordCount: number | null;
  paraCount: number | null;
  burstiness: number | null;
  ttr: number | null;
  count: number;
}

// ==================== Service ====================

export const styleAnalysisService = {
  /**
   * Get all style analyses with pagination and filtering
   * Only selects fields needed for list display to optimize performance
   */
  async getAll(options: GetAllStyleAnalysesOptions) {
    const { page, pageSize, search, primaryType, status, userId } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    // 多字段模糊搜索: sourceTitle, styleName, primaryType
    // 注意：不搜索 executionPrompt，因为它是大文本字段，LIKE 查询极慢
    // 如需搜索提示词内容，使用向量搜索 (hybridSearch)
    if (search) {
      const searchCondition = or(
        like(styleAnalyses.sourceTitle, `%${search}%`),
        like(styleAnalyses.styleName, `%${search}%`),
        like(styleAnalyses.primaryType, `%${search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }
    if (primaryType) {
      conditions.push(eq(styleAnalyses.primaryType, primaryType));
    }
    if (status) {
      conditions.push(eq(styleAnalyses.status, status as "PENDING" | "SUCCESS" | "FAILED"));
    }
    if (userId) {
      conditions.push(eq(styleAnalyses.userId, userId));
    }
    // 排除已删除
    conditions.push(sql`${styleAnalyses.deletedAt} IS NULL`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Select fields needed for card display (includes JSONB for tabs, excludes rawJsonFull)
    const [data, countResult] = await Promise.all([
      db
        .select({
          id: styleAnalyses.id,
          userId: styleAnalyses.userId,
          createdAt: styleAnalyses.createdAt,
          updatedAt: styleAnalyses.updatedAt,
          sourceUrl: styleAnalyses.sourceUrl,
          sourceTitle: styleAnalyses.sourceTitle,
          styleName: styleAnalyses.styleName,
          primaryType: styleAnalyses.primaryType,
          wordCount: styleAnalyses.wordCount,
          paraCount: styleAnalyses.paraCount,
          metricsBurstiness: styleAnalyses.metricsBurstiness,
          metricsTtr: styleAnalyses.metricsTtr,
          status: styleAnalyses.status,
          // JSONB fields for tabs
          styleIdentity: styleAnalyses.styleIdentity,
          lexicalLogic: styleAnalyses.lexicalLogic,
          metricsConstraints: styleAnalyses.metricsConstraints,
          rhetoricLogic: styleAnalyses.rhetoricLogic,
          coreRules: styleAnalyses.coreRules,
          blueprint: styleAnalyses.blueprint,
          antiPatterns: styleAnalyses.antiPatterns,
          goldenSample: styleAnalyses.goldenSample,
          transferDemo: styleAnalyses.transferDemo,
          executionPrompt: styleAnalyses.executionPrompt,
          // Excluded: rawJsonFull (too large, rarely needed)
        })
        .from(styleAnalyses)
        .where(whereClause)
        .orderBy(desc(styleAnalyses.updatedAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(styleAnalyses)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      logs: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  /**
   * Get a single analysis by ID
   */
  async getById(id: string): Promise<StyleAnalysis | null> {
    const [analysis] = await db
      .select()
      .from(styleAnalyses)
      .where(and(
        eq(styleAnalyses.id, id),
        sql`${styleAnalyses.deletedAt} IS NULL`
      ))
      .limit(1);

    return analysis ?? null;
  },

  /**
   * Get analysis by source URL (includes soft-deleted for upsert)
   */
  async getBySourceUrl(sourceUrl: string, includeDeleted = false): Promise<StyleAnalysis | null> {
    const conditions = [eq(styleAnalyses.sourceUrl, sourceUrl)];
    if (!includeDeleted) {
      conditions.push(sql`${styleAnalyses.deletedAt} IS NULL`);
    }

    const [analysis] = await db
      .select()
      .from(styleAnalyses)
      .where(and(...conditions))
      .limit(1);

    return analysis ?? null;
  },

  /**
   * Get analyses by user ID
   */
  async getByUserId(userId: string): Promise<StyleAnalysis[]> {
    return db
      .select()
      .from(styleAnalyses)
      .where(and(
        eq(styleAnalyses.userId, userId),
        sql`${styleAnalyses.deletedAt} IS NULL`
      ))
      .orderBy(desc(styleAnalyses.createdAt));
  },

  /**
   * Create a new style analysis
   */
  async create(input: CreateStyleAnalysisInput): Promise<{ id: string; analysis: StyleAnalysis }> {
    // Extract fallback values from rawJsonFull.meta_info if available
    const rawJson = input.rawJsonFull as Record<string, unknown> | undefined;
    const metaInfo = rawJson?.meta_info as Record<string, unknown> | undefined;
    const styleIdentity = input.styleIdentity as Record<string, unknown> | undefined;

    // Default status to SUCCESS unless explicitly specified
    const derivedStatus = input.status ?? "SUCCESS";

    const [analysis] = await db.insert(styleAnalyses).values({
      userId: input.userId,
      sourceUrl: input.sourceUrl,
      sourceTitle: input.sourceTitle ?? (metaInfo?.source_title as string),
      styleName: input.styleName ?? (metaInfo?.style_name as string) ?? (styleIdentity?.style_name as string),
      primaryType: input.primaryType ?? (metaInfo?.primary_type as string),
      analysisVersion: input.analysisVersion ?? (metaInfo?.version as string),
      executionPrompt: input.executionPrompt,
      wordCount: input.wordCount ?? (metaInfo?.word_count as number),
      paraCount: input.paraCount ?? (metaInfo?.para_count as number),
      metricsBurstiness: input.metricsBurstiness ?? (metaInfo?.burstiness as number),
      metricsTtr: input.metricsTtr ?? (metaInfo?.ttr as number),
      metricsAvgSentLen: input.metricsAvgSentLen ?? (metaInfo?.avg_sent_len as number),
      styleIdentity: input.styleIdentity,
      metricsConstraints: input.metricsConstraints,
      lexicalLogic: input.lexicalLogic,
      rhetoricLogic: input.rhetoricLogic,
      goldenSample: input.goldenSample,
      transferDemo: input.transferDemo,
      coreRules: input.coreRules,
      blueprint: input.blueprint,
      antiPatterns: input.antiPatterns,
      rawJsonFull: input.rawJsonFull,
      metadata: input.metadata,
      status: derivedStatus,
    }).returning();

    return { id: analysis!.id, analysis: analysis! };
  },

  /**
   * Upsert by source URL (auto-restores soft-deleted records)
   */
  async upsert(input: CreateStyleAnalysisInput): Promise<{ id: string; analysis: StyleAnalysis; created: boolean }> {
    if (!input.sourceUrl) {
      const result = await this.create(input);
      return { ...result, created: true };
    }

    // Include soft-deleted records in lookup
    const existing = await this.getBySourceUrl(input.sourceUrl, true);
    if (existing) {
      // Extract fallback values from rawJsonFull.meta_info if available
      const inputRawJson = input.rawJsonFull as Record<string, unknown> | undefined;
      const existingRawJson = existing.rawJsonFull as Record<string, unknown> | undefined;
      const metaInfo = (inputRawJson?.meta_info ?? existingRawJson?.meta_info) as Record<string, unknown> | undefined;
      const styleIdentity = (input.styleIdentity ?? existing.styleIdentity) as Record<string, unknown> | undefined;

      // Default status to SUCCESS unless explicitly specified
      const derivedStatus = input.status ?? "SUCCESS";

      // Update existing (and restore if soft-deleted)
      const [updated] = await db
        .update(styleAnalyses)
        .set({
          sourceTitle: input.sourceTitle ?? (metaInfo?.source_title as string) ?? existing.sourceTitle,
          styleName: input.styleName ?? (metaInfo?.style_name as string) ?? (styleIdentity?.style_name as string) ?? existing.styleName,
          primaryType: input.primaryType ?? (metaInfo?.primary_type as string) ?? existing.primaryType,
          analysisVersion: input.analysisVersion ?? (metaInfo?.version as string) ?? existing.analysisVersion,
          executionPrompt: input.executionPrompt ?? existing.executionPrompt,
          wordCount: input.wordCount ?? (metaInfo?.word_count as number) ?? existing.wordCount,
          paraCount: input.paraCount ?? (metaInfo?.para_count as number) ?? existing.paraCount,
          metricsBurstiness: input.metricsBurstiness ?? (metaInfo?.burstiness as number) ?? existing.metricsBurstiness,
          metricsTtr: input.metricsTtr ?? (metaInfo?.ttr as number) ?? existing.metricsTtr,
          metricsAvgSentLen: input.metricsAvgSentLen ?? (metaInfo?.avg_sent_len as number) ?? existing.metricsAvgSentLen,
          styleIdentity: input.styleIdentity ?? existing.styleIdentity,
          metricsConstraints: input.metricsConstraints ?? existing.metricsConstraints,
          lexicalLogic: input.lexicalLogic ?? existing.lexicalLogic,
          rhetoricLogic: input.rhetoricLogic ?? existing.rhetoricLogic,
          goldenSample: input.goldenSample ?? existing.goldenSample,
          transferDemo: input.transferDemo ?? existing.transferDemo,
          coreRules: input.coreRules ?? existing.coreRules,
          blueprint: input.blueprint ?? existing.blueprint,
          antiPatterns: input.antiPatterns ?? existing.antiPatterns,
          rawJsonFull: input.rawJsonFull ?? existing.rawJsonFull,
          metadata: input.metadata ?? existing.metadata,
          status: derivedStatus,
          updatedAt: new Date(),
          deletedAt: null, // Auto-restore soft-deleted records
        })
        .where(eq(styleAnalyses.id, existing.id))
        .returning();
      return { id: updated!.id, analysis: updated!, created: false };
    }

    const result = await this.create(input);
    return { ...result, created: true };
  },

  /**
   * Update an existing analysis
   */
  async update(input: UpdateStyleAnalysisInput): Promise<{ success: boolean }> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.sourceTitle !== undefined) updateData.sourceTitle = input.sourceTitle;
    if (input.styleName !== undefined) updateData.styleName = input.styleName;
    if (input.primaryType !== undefined) updateData.primaryType = input.primaryType;
    if (input.analysisVersion !== undefined) updateData.analysisVersion = input.analysisVersion;
    if (input.executionPrompt !== undefined) updateData.executionPrompt = input.executionPrompt;
    if (input.styleIdentity !== undefined) updateData.styleIdentity = input.styleIdentity;
    if (input.metricsConstraints !== undefined) updateData.metricsConstraints = input.metricsConstraints;
    if (input.lexicalLogic !== undefined) updateData.lexicalLogic = input.lexicalLogic;
    if (input.rhetoricLogic !== undefined) updateData.rhetoricLogic = input.rhetoricLogic;
    if (input.goldenSample !== undefined) updateData.goldenSample = input.goldenSample;
    if (input.transferDemo !== undefined) updateData.transferDemo = input.transferDemo;
    if (input.coreRules !== undefined) updateData.coreRules = input.coreRules;
    if (input.blueprint !== undefined) updateData.blueprint = input.blueprint;
    if (input.antiPatterns !== undefined) updateData.antiPatterns = input.antiPatterns;
    if (input.status !== undefined) updateData.status = input.status;

    await db
      .update(styleAnalyses)
      .set(updateData)
      .where(eq(styleAnalyses.id, input.id));

    return { success: true };
  },

  /**
   * Hard delete a single analysis
   */
  async delete(id: string): Promise<{ success: boolean }> {
    await db
      .delete(styleAnalyses)
      .where(eq(styleAnalyses.id, id));
    return { success: true };
  },

  /**
   * Batch hard delete analyses by IDs
   */
  async batchDelete(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
    if (ids.length === 0) return { success: true, deletedCount: 0 };

    await db
      .delete(styleAnalyses)
      .where(inArray(styleAnalyses.id, ids));

    return { success: true, deletedCount: ids.length };
  },

  /**
   * Get all distinct primary types
   */
  async getPrimaryTypes(): Promise<string[]> {
    const result = await db
      .select({ primaryType: styleAnalyses.primaryType })
      .from(styleAnalyses)
      .where(and(
        sql`${styleAnalyses.primaryType} IS NOT NULL`,
        sql`${styleAnalyses.deletedAt} IS NULL`
      ))
      .groupBy(styleAnalyses.primaryType);

    return result.map((r) => r.primaryType).filter((t): t is string => t !== null && t !== '');
  },

  /**
   * Get statistics
   */
  async getStatistics(userId?: string) {
    const conditions = [sql`${styleAnalyses.deletedAt} IS NULL`];
    if (userId) {
      conditions.push(eq(styleAnalyses.userId, userId));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(styleAnalyses)
      .where(whereClause);

    const primaryTypeCounts = await db
      .select({
        primaryType: styleAnalyses.primaryType,
        count: sql<number>`count(*)`,
      })
      .from(styleAnalyses)
      .where(and(whereClause, sql`${styleAnalyses.primaryType} IS NOT NULL`))
      .groupBy(styleAnalyses.primaryType);

    const statusCounts = await db
      .select({
        status: styleAnalyses.status,
        count: sql<number>`count(*)`,
      })
      .from(styleAnalyses)
      .where(whereClause)
      .groupBy(styleAnalyses.status);

    return {
      total: totalResult?.count ?? 0,
      byPrimaryType: Object.fromEntries(
        primaryTypeCounts
          .filter((t) => t.primaryType !== null && t.primaryType !== '')
          .map((t) => [t.primaryType, t.count])
      ),
      byStatus: Object.fromEntries(
        statusCounts.map((s) => [s.status, s.count])
      ),
    };
  },

  /**
   * Export analyses (optionally filtered by IDs)
   */
  async export(ids?: string[]): Promise<StyleAnalysis[]> {
    const baseCondition = sql`${styleAnalyses.deletedAt} IS NULL`;

    if (ids && ids.length > 0) {
      return db
        .select()
        .from(styleAnalyses)
        .where(and(baseCondition, inArray(styleAnalyses.id, ids)));
    }

    return db
      .select()
      .from(styleAnalyses)
      .where(baseCondition)
      .orderBy(desc(styleAnalyses.createdAt));
  },

  // ==================== Domain Methods ====================

  /**
   * 获取用户写作风格画像
   */
  async getUserStyleProfile(userId: string): Promise<UserStyleProfile | null> {
    const baseConditions = and(
      eq(styleAnalyses.userId, userId),
      sql`${styleAnalyses.deletedAt} IS NULL`
    );

    // 获取总数和平均指标
    const [statsResult] = await db
      .select({
        total: sql<number>`count(*)`,
        avgWordCount: sql<number>`avg(${styleAnalyses.wordCount})`,
        avgParaCount: sql<number>`avg(${styleAnalyses.paraCount})`,
        avgBurstiness: sql<number>`avg(${styleAnalyses.metricsBurstiness})`,
        avgTtr: sql<number>`avg(${styleAnalyses.metricsTtr})`,
        lastAnalysis: sql<Date>`max(${styleAnalyses.createdAt})`,
      })
      .from(styleAnalyses)
      .where(baseConditions);

    if (!statsResult || statsResult.total === 0) {
      return null;
    }

    // 获取类型分布
    const typeDistribution = await db
      .select({
        primaryType: styleAnalyses.primaryType,
        count: sql<number>`count(*)`,
      })
      .from(styleAnalyses)
      .where(and(baseConditions, sql`${styleAnalyses.primaryType} IS NOT NULL`))
      .groupBy(styleAnalyses.primaryType)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    // 聚合语气关键词 (从 lexicalLogic)
    const keywordsResult = await db
      .select({
        lexicalLogic: styleAnalyses.lexicalLogic,
      })
      .from(styleAnalyses)
      .where(baseConditions)
      .limit(20);

    // 统计词频
    const wordFrequency: Record<string, number> = {};
    for (const row of keywordsResult) {
      const data = row.lexicalLogic as LexicalLogicData | null;
      const keywords = data?.tone_keywords;
      if (Array.isArray(keywords)) {
        for (const word of keywords) {
          wordFrequency[word] = (wordFrequency[word] ?? 0) + 1;
        }
      }
    }

    const commonToneKeywords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);

    return {
      userId,
      totalAnalyses: statsResult.total,
      topPrimaryTypes: typeDistribution.map((t) => ({
        primaryType: t.primaryType!,
        count: t.count,
        percentage: statsResult.total > 0 ? t.count / statsResult.total : 0,
      })),
      averageMetrics: {
        wordCount: statsResult.avgWordCount,
        paraCount: statsResult.avgParaCount,
        burstiness: statsResult.avgBurstiness,
        ttr: statsResult.avgTtr,
      },
      commonToneKeywords,
      lastAnalysisAt: statsResult.lastAnalysis,
    };
  },

  /**
   * 获取用户指标趋势
   */
  async getMetricsTrend(
    userId: string,
    days: number = 30
  ): Promise<MetricsTrendPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db
      .select({
        date: sql<string>`date(${styleAnalyses.createdAt})`,
        avgWordCount: sql<number>`avg(${styleAnalyses.wordCount})`,
        avgParaCount: sql<number>`avg(${styleAnalyses.paraCount})`,
        avgBurstiness: sql<number>`avg(${styleAnalyses.metricsBurstiness})`,
        avgTtr: sql<number>`avg(${styleAnalyses.metricsTtr})`,
        count: sql<number>`count(*)`,
      })
      .from(styleAnalyses)
      .where(and(
        eq(styleAnalyses.userId, userId),
        sql`${styleAnalyses.deletedAt} IS NULL`,
        gte(styleAnalyses.createdAt, startDate)
      ))
      .groupBy(sql`date(${styleAnalyses.createdAt})`)
      .orderBy(sql`date(${styleAnalyses.createdAt})`);

    return result.map((r) => ({
      date: r.date,
      wordCount: r.avgWordCount,
      paraCount: r.avgParaCount,
      burstiness: r.avgBurstiness,
      ttr: r.avgTtr,
      count: r.count,
    }));
  },

  /**
   * 获取类型分析洞察
   */
  async getPrimaryTypeInsights(primaryType: string) {
    const baseCondition = and(
      eq(styleAnalyses.primaryType, primaryType),
      sql`${styleAnalyses.deletedAt} IS NULL`
    );

    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        avgWordCount: sql<number>`avg(${styleAnalyses.wordCount})`,
        avgParaCount: sql<number>`avg(${styleAnalyses.paraCount})`,
        avgBurstiness: sql<number>`avg(${styleAnalyses.metricsBurstiness})`,
        avgTtr: sql<number>`avg(${styleAnalyses.metricsTtr})`,
        minWordCount: sql<number>`min(${styleAnalyses.wordCount})`,
        maxWordCount: sql<number>`max(${styleAnalyses.wordCount})`,
      })
      .from(styleAnalyses)
      .where(baseCondition);

    if (!stats || stats.total === 0) {
      return null;
    }

    return {
      primaryType,
      totalAnalyses: stats.total,
      metrics: {
        wordCount: {
          avg: stats.avgWordCount,
          min: stats.minWordCount,
          max: stats.maxWordCount,
        },
        paraCount: {
          avg: stats.avgParaCount,
        },
        burstiness: {
          avg: stats.avgBurstiness,
        },
        ttr: {
          avg: stats.avgTtr,
        },
      },
    };
  },

  // ==================== Execution Prompt Generation ====================

  /**
   * 从 StyleAnalysis 记录动态生成 execution_prompt
   * 替代 LLM 单独输出，节省 token 并消除截断问题
   */
  generateExecutionPromptFromRecord(analysis: StyleAnalysis): string {
    return generateExecutionPrompt({
      styleName: analysis.styleName,
      paraCount: analysis.paraCount,
      styleIdentity: analysis.styleIdentity,
      metricsConstraints: analysis.metricsConstraints,
      lexicalLogic: analysis.lexicalLogic,
      rhetoricLogic: analysis.rhetoricLogic,
      goldenSample: analysis.goldenSample,
      coreRules: analysis.coreRules,
      blueprint: analysis.blueprint,
      antiPatterns: analysis.antiPatterns,
    });
  },

  /**
   * 生成简洁版预览（用于列表展示）
   */
  generateExecutionPromptPreviewFromRecord(analysis: StyleAnalysis): string {
    return generateExecutionPromptPreview({
      styleName: analysis.styleName,
      paraCount: analysis.paraCount,
      styleIdentity: analysis.styleIdentity,
      blueprint: analysis.blueprint,
    });
  },

  /**
   * 获取记录并附带动态生成的 execution_prompt
   */
  async getByIdWithExecutionPrompt(id: string): Promise<(StyleAnalysis & { generatedExecutionPrompt: string }) | null> {
    const analysis = await this.getById(id);
    if (!analysis) return null;

    return {
      ...analysis,
      generatedExecutionPrompt: this.generateExecutionPromptFromRecord(analysis),
    };
  },

  // ==================== Embedding Methods ====================

  /**
   * Get OpenAI-compatible client (lazy initialization)
   */
  getEmbeddingClient(): OpenAI {
    const config = getEmbeddingConfig();
    if (!config.apiKey) {
      throw new Error("EMBEDDING_API_KEY environment variable is not set");
    }
    return new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiUrl,
    });
  },

  /**
   * Create content hash for deduplication
   */
  createContentHash(content: string): string {
    return createHash("sha256").update(content).digest("hex").slice(0, 32);
  },

  /**
   * Prepare content for embedding from a style analysis record
   */
  prepareEmbeddingContent(analysis: StyleAnalysis): string {
    const parts: string[] = [];

    // 标题
    if (analysis.sourceTitle) {
      parts.push(`标题: ${analysis.sourceTitle}`);
    }

    // 风格名称
    if (analysis.styleName) {
      parts.push(`风格: ${analysis.styleName}`);
    }

    // 文章类型
    if (analysis.primaryType) {
      parts.push(`类型: ${analysis.primaryType}`);
    }

    // 执行提示词 (最重要的内容)
    if (analysis.executionPrompt) {
      parts.push(`提示词: ${analysis.executionPrompt}`);
    }

    // 风格身份描述
    const styleIdentity = analysis.styleIdentity;
    if (styleIdentity?.persona_description) {
      parts.push(`人设: ${styleIdentity.persona_description}`);
    }

    const combined = parts.join("\n");

    // Truncate if too long
    if (combined.length > MAX_CONTENT_LENGTH) {
      return combined.slice(0, MAX_CONTENT_LENGTH) + "...";
    }

    return combined;
  },

  /**
   * Generate embedding vector for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const client = this.getEmbeddingClient();
    const config = getEmbeddingConfig();

    const response = await client.embeddings.create({
      model: config.model,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0]!.embedding;
  },

  /**
   * Generate and store embedding for a style analysis
   */
  async generateAndStoreEmbedding(id: string): Promise<{ success: boolean; reason?: string }> {
    const analysis = await this.getById(id);
    if (!analysis) {
      return { success: false, reason: "Analysis not found" };
    }

    const content = this.prepareEmbeddingContent(analysis);
    if (!content || content.length < 10) {
      return { success: false, reason: "Not enough content for embedding" };
    }

    const contentHash = this.createContentHash(content);

    // Check if embedding already exists with same content
    if (analysis.embeddingContentHash === contentHash) {
      return { success: true, reason: "Embedding already up to date" };
    }

    // Generate new embedding
    const config = getEmbeddingConfig();
    const embedding = await this.generateEmbedding(content);

    // Update record with embedding
    await db
      .update(styleAnalyses)
      .set({
        embedding,
        embeddingContentHash: contentHash,
        embeddingModelVersion: config.model,
        updatedAt: new Date(),
      })
      .where(eq(styleAnalyses.id, id));

    return { success: true };
  },

  /**
   * Generate embeddings for all analyses that don't have one
   */
  async generateMissingEmbeddings(limit = 50): Promise<{ processed: number; errors: number }> {
    // Find analyses without embeddings
    const analysesWithoutEmbeddings = await db
      .select({
        id: styleAnalyses.id,
      })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.status, "SUCCESS"),
          isNull(styleAnalyses.embedding),
          isNull(styleAnalyses.deletedAt)
        )
      )
      .orderBy(desc(styleAnalyses.createdAt))
      .limit(limit);

    let processed = 0;
    let errors = 0;

    for (const analysis of analysesWithoutEmbeddings) {
      try {
        const result = await this.generateAndStoreEmbedding(analysis.id);
        if (result.success) {
          processed++;
        } else {
          console.error(`Skipped embedding for ${analysis.id}: ${result.reason}`);
        }
      } catch (error) {
        console.error(`Failed to generate embedding for analysis ${analysis.id}:`, error);
        errors++;
      }
    }

    return { processed, errors };
  },

  /**
   * Search analyses by vector similarity
   */
  async searchByVector(
    queryText: string,
    userId: string,
    limit = 10,
    minSimilarity = 0.3
  ): Promise<Array<{ id: string; similarity: number }>> {
    const queryEmbedding = await this.generateEmbedding(queryText);
    const vectorString = `[${queryEmbedding.join(",")}]`;

    // Use cosine similarity: 1 - cosine_distance
    const results = await db.execute(sql`
      SELECT
        id,
        1 - (embedding <=> ${vectorString}::vector) as similarity
      FROM style_analyses
      WHERE deleted_at IS NULL
        AND user_id = ${userId}
        AND status = 'SUCCESS'
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> ${vectorString}::vector) >= ${minSimilarity}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `);

    return (results as unknown as Array<{ id: string; similarity: number }>).map((row) => ({
      id: row.id,
      similarity: Number(row.similarity),
    }));
  },

  /**
   * Hybrid search: combine keyword and vector search
   * Returns same structure as getAll for compatibility
   */
  async hybridSearch(
    options: GetAllStyleAnalysesOptions & { useVectorSearch?: boolean }
  ) {
    const { search, userId, useVectorSearch = true, page = 1, pageSize = 20 } = options;

    // If no search query or vector search disabled, use regular getAll
    if (!search || !useVectorSearch || !userId) {
      return this.getAll(options);
    }

    // Get vector search results
    let vectorResults: Array<{ id: string; similarity: number }> = [];
    try {
      vectorResults = await this.searchByVector(search, userId, 50, 0.3);
    } catch (error) {
      console.error("Vector search failed, falling back to keyword search:", error);
      // Fall back to keyword search if vector search fails
      return this.getAll(options);
    }

    // If no vector results, fall back to keyword search
    if (vectorResults.length === 0) {
      return this.getAll(options);
    }

    // Get full records for vector results
    const vectorIds = vectorResults.map((r) => r.id);
    const similarityMap = new Map(vectorResults.map((r) => [r.id, r.similarity]));

    const vectorRecords = await db
      .select()
      .from(styleAnalyses)
      .where(
        and(
          inArray(styleAnalyses.id, vectorIds),
          isNull(styleAnalyses.deletedAt)
        )
      );

    // Also get keyword search results
    const keywordResult = await this.getAll({ ...options, pageSize: 50 });

    // Merge and dedupe results, prioritizing by combined score
    type RecordWithScore = typeof vectorRecords[number] & { score: number };
    const allResultsMap = new Map<string, RecordWithScore>();

    // Add vector results with similarity score
    for (const record of vectorRecords) {
      const similarity = similarityMap.get(record.id) ?? 0;
      allResultsMap.set(record.id, { ...record, score: similarity * 0.7 }); // Weight vector results
    }

    // Add keyword results with base score (need to fetch full records)
    const keywordIds = keywordResult.logs.map((r) => r.id);
    const keywordFullRecords = keywordIds.length > 0
      ? await db
          .select()
          .from(styleAnalyses)
          .where(inArray(styleAnalyses.id, keywordIds))
      : [];

    for (const record of keywordFullRecords) {
      const existing = allResultsMap.get(record.id);
      if (existing) {
        // Boost score if found in both
        existing.score += 0.3;
      } else {
        allResultsMap.set(record.id, { ...record, score: 0.3 }); // Base score for keyword match
      }
    }

    // Sort by score and apply pagination
    const allResults = Array.from(allResultsMap.values())
      .sort((a, b) => b.score - a.score);

    const total = allResults.length;
    const offset = (page - 1) * pageSize;
    const paginatedResults = allResults.slice(offset, offset + pageSize);

    // Remove score from results
    const logs = paginatedResults.map(({ score, ...record }) => record);

    return {
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  /**
   * Get embedding stats
   */
  async getEmbeddingStats(): Promise<{ total: number; withEmbeddings: number; withoutEmbeddings: number }> {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.status, "SUCCESS"),
          isNull(styleAnalyses.deletedAt)
        )
      );

    const [withEmbeddingsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.status, "SUCCESS"),
          isNull(styleAnalyses.deletedAt),
          sql`${styleAnalyses.embedding} IS NOT NULL`
        )
      );

    const total = Number(totalResult?.count ?? 0);
    const withEmbeddings = Number(withEmbeddingsResult?.count ?? 0);

    return {
      total,
      withEmbeddings,
      withoutEmbeddings: total - withEmbeddings,
    };
  },
};

export type StyleAnalysisService = typeof styleAnalysisService;
