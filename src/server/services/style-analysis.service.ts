import { eq, desc, like, and, sql, inArray, gte } from "drizzle-orm";
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
  // 策略层 JSONB
  styleIdentityData?: StyleIdentityData;
  metricsConstraintsData?: MetricsConstraintsData;
  lexicalLogicData?: LexicalLogicData;
  rhetoricLogicData?: RhetoricLogicData;
  goldenSampleData?: GoldenSampleData;
  transferDemoData?: TransferDemoData;
  // 数组层 JSONB
  coreRulesData?: CoreRuleItem[];
  blueprintData?: BlueprintItem[];
  antiPatternsData?: AntiPatternItem[];
  // 备份
  rawJsonFull?: Record<string, unknown>;
  status?: "PENDING" | "SUCCESS" | "FAILED";
}

export interface UpdateStyleAnalysisInput {
  id: string;
  sourceTitle?: string;
  styleName?: string;
  primaryType?: string;
  analysisVersion?: string;
  executionPrompt?: string;
  styleIdentityData?: StyleIdentityData;
  metricsConstraintsData?: MetricsConstraintsData;
  lexicalLogicData?: LexicalLogicData;
  rhetoricLogicData?: RhetoricLogicData;
  goldenSampleData?: GoldenSampleData;
  transferDemoData?: TransferDemoData;
  coreRulesData?: CoreRuleItem[];
  blueprintData?: BlueprintItem[];
  antiPatternsData?: AntiPatternItem[];
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

    // 搜索 sourceTitle 或 styleIdentityData 中的 style_name
    if (search) {
      conditions.push(like(styleAnalyses.sourceTitle, `%${search}%`));
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

    // Only select fields needed for list display (excludes large JSONB fields)
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
          // Include smaller JSONB fields needed for list display
          styleIdentityData: styleAnalyses.styleIdentityData,
          lexicalLogicData: styleAnalyses.lexicalLogicData,
          metricsConstraintsData: styleAnalyses.metricsConstraintsData,
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
    const styleIdentity = input.styleIdentityData as Record<string, unknown> | undefined;

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
      styleIdentityData: input.styleIdentityData,
      metricsConstraintsData: input.metricsConstraintsData,
      lexicalLogicData: input.lexicalLogicData,
      rhetoricLogicData: input.rhetoricLogicData,
      goldenSampleData: input.goldenSampleData,
      transferDemoData: input.transferDemoData,
      coreRulesData: input.coreRulesData,
      blueprintData: input.blueprintData,
      antiPatternsData: input.antiPatternsData,
      rawJsonFull: input.rawJsonFull,
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
      const styleIdentity = (input.styleIdentityData ?? existing.styleIdentityData) as Record<string, unknown> | undefined;

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
          styleIdentityData: input.styleIdentityData ?? existing.styleIdentityData,
          metricsConstraintsData: input.metricsConstraintsData ?? existing.metricsConstraintsData,
          lexicalLogicData: input.lexicalLogicData ?? existing.lexicalLogicData,
          rhetoricLogicData: input.rhetoricLogicData ?? existing.rhetoricLogicData,
          goldenSampleData: input.goldenSampleData ?? existing.goldenSampleData,
          transferDemoData: input.transferDemoData ?? existing.transferDemoData,
          coreRulesData: input.coreRulesData ?? existing.coreRulesData,
          blueprintData: input.blueprintData ?? existing.blueprintData,
          antiPatternsData: input.antiPatternsData ?? existing.antiPatternsData,
          rawJsonFull: input.rawJsonFull ?? existing.rawJsonFull,
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
    if (input.styleIdentityData !== undefined) updateData.styleIdentityData = input.styleIdentityData;
    if (input.metricsConstraintsData !== undefined) updateData.metricsConstraintsData = input.metricsConstraintsData;
    if (input.lexicalLogicData !== undefined) updateData.lexicalLogicData = input.lexicalLogicData;
    if (input.rhetoricLogicData !== undefined) updateData.rhetoricLogicData = input.rhetoricLogicData;
    if (input.goldenSampleData !== undefined) updateData.goldenSampleData = input.goldenSampleData;
    if (input.transferDemoData !== undefined) updateData.transferDemoData = input.transferDemoData;
    if (input.coreRulesData !== undefined) updateData.coreRulesData = input.coreRulesData;
    if (input.blueprintData !== undefined) updateData.blueprintData = input.blueprintData;
    if (input.antiPatternsData !== undefined) updateData.antiPatternsData = input.antiPatternsData;
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

    // 聚合语气关键词 (从 lexicalLogicData)
    const keywordsResult = await db
      .select({
        lexicalLogicData: styleAnalyses.lexicalLogicData,
      })
      .from(styleAnalyses)
      .where(baseConditions)
      .limit(20);

    // 统计词频
    const wordFrequency: Record<string, number> = {};
    for (const row of keywordsResult) {
      const data = row.lexicalLogicData as LexicalLogicData | null;
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
      styleIdentityData: analysis.styleIdentityData,
      metricsConstraintsData: analysis.metricsConstraintsData,
      lexicalLogicData: analysis.lexicalLogicData,
      rhetoricLogicData: analysis.rhetoricLogicData,
      goldenSampleData: analysis.goldenSampleData,
      coreRulesData: analysis.coreRulesData,
      blueprintData: analysis.blueprintData,
      antiPatternsData: analysis.antiPatternsData,
    });
  },

  /**
   * 生成简洁版预览（用于列表展示）
   */
  generateExecutionPromptPreviewFromRecord(analysis: StyleAnalysis): string {
    return generateExecutionPromptPreview({
      styleName: analysis.styleName,
      paraCount: analysis.paraCount,
      styleIdentityData: analysis.styleIdentityData,
      blueprintData: analysis.blueprintData,
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
};

export type StyleAnalysisService = typeof styleAnalysisService;
