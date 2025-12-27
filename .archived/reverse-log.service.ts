import { eq, desc, like, and, sql, inArray, isNull, gte } from "drizzle-orm";
import { db } from "@/server/db";
import {
  reverseEngineering,
  type ReverseEngineering,
  type StyleBlueprint,
  type ReverseEngineeringMetadata,
} from "@/server/db/schema";

// ==================== Types ====================

/** 用户写作风格画像 */
export interface UserStyleProfile {
  userId: string;
  totalAnalyses: number;
  /** 最常用的文体类型及占比 */
  topCategories: Array<{ category: string; count: number; percentage: number }>;
  /** 平均指标 */
  averageMetrics: {
    burstiness: number | null;
    ttr: number | null;
    avgSentLen: number | null;
    avgParaLen: number | null;
  };
  /** 常用词汇特征 (从 styleBlueprint.meta_profile.tone_keywords 聚合) */
  commonVocabulary: string[];
  /** 最近分析时间 */
  lastAnalysisAt: Date | null;
}

/** Prompt 建议 */
export interface PromptSuggestion {
  id: string;
  title: string | null;
  category: string | null;
  executionPrompt: string | null;
  styleName: string | null;
  /** 基于指标的质量分数 */
  qualityScore: number;
}

/** 指标趋势数据点 */
export interface MetricsTrendPoint {
  date: string;
  burstiness: number | null;
  ttr: number | null;
  avgSentLen: number | null;
  avgParaLen: number | null;
  count: number;
}

export interface GetAllReverseLogsOptions {
  page: number;
  pageSize: number;
  search?: string;
  userId?: string;
}

export interface CreateReverseLogInput {
  userId: string;
  inputContent?: string;
  title?: string;
  contentText?: string;
  // Metrics
  metricsBurstiness?: number;
  metricsTtr?: number;
  metricsAvgSentLen?: number;
  metricsAvgParaLen?: number;
  metricsWordCount?: number;
  metricsSentenceCount?: number;
  metricsParagraphCount?: number;
  // Style blueprint (main data)
  styleBlueprint?: StyleBlueprint;
  // Execution prompt (stored separately for easy access)
  executionPrompt?: string;
  // Metadata
  metadata?: ReverseEngineeringMetadata;
}

export interface UpdateReverseLogInput {
  id: string;
  title?: string;
  contentText?: string;
  styleBlueprint?: StyleBlueprint;
  executionPrompt?: string;
  metadata?: ReverseEngineeringMetadata;
}

// ==================== Service ====================

export const reverseLogService = {
  /**
   * Get all reverse engineering logs with pagination and filtering
   */
  async getAll(options: GetAllReverseLogsOptions) {
    const { page, pageSize, search, userId } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    // Exclude soft-deleted records
    conditions.push(isNull(reverseEngineering.deletedAt));

    if (search) {
      conditions.push(like(reverseEngineering.title, `%${search}%`));
    }
    if (userId) {
      conditions.push(eq(reverseEngineering.userId, userId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(reverseEngineering)
        .where(whereClause)
        .orderBy(desc(reverseEngineering.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(reverseEngineering)
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
   * Get a single log by ID
   */
  async getById(id: string): Promise<ReverseEngineering | null> {
    const [log] = await db
      .select()
      .from(reverseEngineering)
      .where(and(eq(reverseEngineering.id, id), isNull(reverseEngineering.deletedAt)))
      .limit(1);

    return log ?? null;
  },

  /**
   * Get log by input content (article URL)
   */
  async getByInputContent(inputContent: string): Promise<ReverseEngineering | null> {
    const [log] = await db
      .select()
      .from(reverseEngineering)
      .where(and(eq(reverseEngineering.inputContent, inputContent), isNull(reverseEngineering.deletedAt)))
      .limit(1);

    return log ?? null;
  },

  /**
   * Get logs by user ID
   */
  async getByUserId(userId: string): Promise<ReverseEngineering[]> {
    return db
      .select()
      .from(reverseEngineering)
      .where(and(eq(reverseEngineering.userId, userId), isNull(reverseEngineering.deletedAt)))
      .orderBy(desc(reverseEngineering.createdAt));
  },

  /**
   * Create a new reverse engineering log
   */
  async create(input: CreateReverseLogInput): Promise<{ id: string; log: ReverseEngineering }> {
    const [log] = await db.insert(reverseEngineering).values({
      userId: input.userId,
      inputContent: input.inputContent,
      title: input.title,
      contentText: input.contentText,
      // Metrics
      metricsBurstiness: input.metricsBurstiness,
      metricsTtr: input.metricsTtr,
      metricsAvgSentLen: input.metricsAvgSentLen,
      metricsAvgParaLen: input.metricsAvgParaLen,
      metricsWordCount: input.metricsWordCount,
      metricsSentenceCount: input.metricsSentenceCount,
      metricsParagraphCount: input.metricsParagraphCount,
      // Style blueprint
      styleBlueprint: input.styleBlueprint,
      executionPrompt: input.executionPrompt,
      metadata: input.metadata,
    }).returning();

    return { id: log!.id, log: log! };
  },

  /**
   * Upsert by input content (article URL)
   */
  async upsert(input: CreateReverseLogInput): Promise<{ id: string; log: ReverseEngineering; created: boolean }> {
    if (!input.inputContent) {
      const result = await this.create(input);
      return { ...result, created: true };
    }

    const existing = await this.getByInputContent(input.inputContent);
    if (existing) {
      // Update existing
      const [updated] = await db
        .update(reverseEngineering)
        .set({
          title: input.title ?? existing.title,
          contentText: input.contentText ?? existing.contentText,
          metricsBurstiness: input.metricsBurstiness ?? existing.metricsBurstiness,
          metricsTtr: input.metricsTtr ?? existing.metricsTtr,
          metricsAvgSentLen: input.metricsAvgSentLen ?? existing.metricsAvgSentLen,
          metricsAvgParaLen: input.metricsAvgParaLen ?? existing.metricsAvgParaLen,
          metricsWordCount: input.metricsWordCount ?? existing.metricsWordCount,
          metricsSentenceCount: input.metricsSentenceCount ?? existing.metricsSentenceCount,
          metricsParagraphCount: input.metricsParagraphCount ?? existing.metricsParagraphCount,
          styleBlueprint: input.styleBlueprint ?? existing.styleBlueprint,
          executionPrompt: input.executionPrompt ?? existing.executionPrompt,
          metadata: input.metadata ?? existing.metadata,
          updatedAt: new Date(),
        })
        .where(eq(reverseEngineering.id, existing.id))
        .returning();
      return { id: updated!.id, log: updated!, created: false };
    }

    const result = await this.create(input);
    return { ...result, created: true };
  },

  /**
   * Update an existing log
   */
  async update(input: UpdateReverseLogInput): Promise<{ success: boolean }> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.contentText !== undefined) updateData.contentText = input.contentText;
    if (input.styleBlueprint !== undefined) updateData.styleBlueprint = input.styleBlueprint;
    if (input.executionPrompt !== undefined) updateData.executionPrompt = input.executionPrompt;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    await db
      .update(reverseEngineering)
      .set(updateData)
      .where(eq(reverseEngineering.id, input.id));

    return { success: true };
  },

  /**
   * Soft delete a single log
   */
  async delete(id: string): Promise<{ success: boolean }> {
    await db
      .update(reverseEngineering)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(reverseEngineering.id, id));

    return { success: true };
  },

  /**
   * Hard delete a single log
   */
  async hardDelete(id: string): Promise<{ success: boolean }> {
    await db.delete(reverseEngineering).where(eq(reverseEngineering.id, id));
    return { success: true };
  },

  /**
   * Batch soft delete logs by IDs
   */
  async batchDelete(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
    if (ids.length === 0) return { success: true, deletedCount: 0 };

    await db
      .update(reverseEngineering)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(inArray(reverseEngineering.id, ids));

    return { success: true, deletedCount: ids.length };
  },

  /**
   * Restore a soft-deleted log
   */
  async restore(id: string): Promise<{ success: boolean }> {
    await db
      .update(reverseEngineering)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(reverseEngineering.id, id));

    return { success: true };
  },

  /**
   * Get all distinct categories from styleBlueprint
   */
  async getCategories(): Promise<string[]> {
    const result = await db
      .select({ category: sql<string>`style_blueprint->>'category'` })
      .from(reverseEngineering)
      .where(and(
        sql`style_blueprint->>'category' IS NOT NULL`,
        isNull(reverseEngineering.deletedAt)
      ))
      .groupBy(sql`style_blueprint->>'category'`);

    return result.map((r) => r.category).filter((c): c is string => c !== null && c !== '');
  },

  /**
   * Get all distinct style names from styleBlueprint
   */
  async getStyleNames(): Promise<string[]> {
    const result = await db
      .select({ styleName: sql<string>`style_blueprint->>'style_name'` })
      .from(reverseEngineering)
      .where(and(
        sql`style_blueprint->>'style_name' IS NOT NULL`,
        isNull(reverseEngineering.deletedAt)
      ))
      .groupBy(sql`style_blueprint->>'style_name'`);

    return result.map((r) => r.styleName).filter((s): s is string => s !== null && s !== '');
  },

  /**
   * Get statistics
   */
  async getStatistics(userId?: string) {
    const conditions = [isNull(reverseEngineering.deletedAt)];
    if (userId) {
      conditions.push(eq(reverseEngineering.userId, userId));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reverseEngineering)
      .where(whereClause);

    const categoryCounts = await db
      .select({
        category: sql<string>`style_blueprint->>'category'`,
        count: sql<number>`count(*)`,
      })
      .from(reverseEngineering)
      .where(and(whereClause, sql`style_blueprint->>'category' IS NOT NULL`))
      .groupBy(sql`style_blueprint->>'category'`);

    const styleNameCounts = await db
      .select({
        styleName: sql<string>`style_blueprint->>'style_name'`,
        count: sql<number>`count(*)`,
      })
      .from(reverseEngineering)
      .where(and(whereClause, sql`style_blueprint->>'style_name' IS NOT NULL`))
      .groupBy(sql`style_blueprint->>'style_name'`);

    return {
      total: totalResult?.count ?? 0,
      byCategory: Object.fromEntries(
        categoryCounts
          .filter((c) => c.category !== null && c.category !== '')
          .map((c) => [c.category, c.count])
      ),
      byStyleName: Object.fromEntries(
        styleNameCounts
          .filter((s) => s.styleName !== null && s.styleName !== '')
          .map((s) => [s.styleName, s.count])
      ),
    };
  },

  /**
   * Export logs (optionally filtered by IDs)
   */
  async export(ids?: string[]): Promise<ReverseEngineering[]> {
    if (ids && ids.length > 0) {
      return db
        .select()
        .from(reverseEngineering)
        .where(and(inArray(reverseEngineering.id, ids), isNull(reverseEngineering.deletedAt)));
    }

    return db
      .select()
      .from(reverseEngineering)
      .where(isNull(reverseEngineering.deletedAt))
      .orderBy(desc(reverseEngineering.createdAt));
  },

  // ==================== Domain Methods ====================

  /**
   * 获取用户写作风格画像
   * 聚合用户所有分析结果，提取风格特征
   */
  async getUserStyleProfile(userId: string): Promise<UserStyleProfile | null> {
    const baseConditions = and(
      eq(reverseEngineering.userId, userId),
      isNull(reverseEngineering.deletedAt)
    );

    // 获取总数和平均指标
    const [statsResult] = await db
      .select({
        total: sql<number>`count(*)`,
        avgBurstiness: sql<number>`avg(${reverseEngineering.metricsBurstiness})`,
        avgTtr: sql<number>`avg(${reverseEngineering.metricsTtr})`,
        avgSentLen: sql<number>`avg(${reverseEngineering.metricsAvgSentLen})`,
        avgParaLen: sql<number>`avg(${reverseEngineering.metricsAvgParaLen})`,
        lastAnalysis: sql<Date>`max(${reverseEngineering.createdAt})`,
      })
      .from(reverseEngineering)
      .where(baseConditions);

    if (!statsResult || statsResult.total === 0) {
      return null;
    }

    // 获取分类分布 (从 styleBlueprint)
    const categoryDistribution = await db
      .select({
        category: sql<string>`style_blueprint->>'category'`,
        count: sql<number>`count(*)`,
      })
      .from(reverseEngineering)
      .where(and(baseConditions, sql`style_blueprint->>'category' IS NOT NULL`))
      .groupBy(sql`style_blueprint->>'category'`)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    // 聚合词汇特征 (从 styleBlueprint.meta_profile.tone_keywords)
    const vocabularyResult = await db
      .select({
        styleBlueprint: reverseEngineering.styleBlueprint,
      })
      .from(reverseEngineering)
      .where(and(
        baseConditions,
        sql`${reverseEngineering.styleBlueprint} IS NOT NULL`
      ))
      .limit(20);

    // 统计词频
    const wordFrequency: Record<string, number> = {};
    for (const row of vocabularyResult) {
      const blueprint = row.styleBlueprint as StyleBlueprint | null;
      const toneKeywords = blueprint?.meta_profile?.tone_keywords;
      if (Array.isArray(toneKeywords)) {
        for (const word of toneKeywords) {
          wordFrequency[word] = (wordFrequency[word] ?? 0) + 1;
        }
      }
    }

    const commonVocabulary = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);

    return {
      userId,
      totalAnalyses: statsResult.total,
      topCategories: categoryDistribution.map((c) => ({
        category: c.category!,
        count: c.count,
        percentage: statsResult.total > 0 ? c.count / statsResult.total : 0,
      })),
      averageMetrics: {
        burstiness: statsResult.avgBurstiness,
        ttr: statsResult.avgTtr,
        avgSentLen: statsResult.avgSentLen,
        avgParaLen: statsResult.avgParaLen,
      },
      commonVocabulary,
      lastAnalysisAt: statsResult.lastAnalysis,
    };
  },

  /**
   * 获取特定分类的 Prompt 建议
   */
  async getPromptSuggestions(
    category: string,
    limit: number = 5
  ): Promise<PromptSuggestion[]> {
    const logs = await db
      .select({
        id: reverseEngineering.id,
        title: reverseEngineering.title,
        styleBlueprint: reverseEngineering.styleBlueprint,
        executionPrompt: reverseEngineering.executionPrompt,
        metricsTtr: reverseEngineering.metricsTtr,
        metricsBurstiness: reverseEngineering.metricsBurstiness,
      })
      .from(reverseEngineering)
      .where(and(
        sql`style_blueprint->>'category' = ${category}`,
        isNull(reverseEngineering.deletedAt),
        sql`${reverseEngineering.executionPrompt} IS NOT NULL`
      ))
      .orderBy(desc(reverseEngineering.createdAt))
      .limit(limit * 2);

    const withScores = logs.map((log) => {
      const blueprint = log.styleBlueprint as StyleBlueprint | null;
      let score = 50;
      if (log.metricsTtr) score += log.metricsTtr * 30;
      if (log.metricsBurstiness) score += Math.min(log.metricsBurstiness / 2, 20);
      return {
        id: log.id,
        title: log.title,
        category: blueprint?.category ?? null,
        styleName: blueprint?.style_name ?? null,
        executionPrompt: log.executionPrompt,
        qualityScore: Math.round(score),
      };
    });

    return withScores
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, limit);
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
        date: sql<string>`date(${reverseEngineering.createdAt})`,
        avgBurstiness: sql<number>`avg(${reverseEngineering.metricsBurstiness})`,
        avgTtr: sql<number>`avg(${reverseEngineering.metricsTtr})`,
        avgSentLen: sql<number>`avg(${reverseEngineering.metricsAvgSentLen})`,
        avgParaLen: sql<number>`avg(${reverseEngineering.metricsAvgParaLen})`,
        count: sql<number>`count(*)`,
      })
      .from(reverseEngineering)
      .where(and(
        eq(reverseEngineering.userId, userId),
        isNull(reverseEngineering.deletedAt),
        gte(reverseEngineering.createdAt, startDate)
      ))
      .groupBy(sql`date(${reverseEngineering.createdAt})`)
      .orderBy(sql`date(${reverseEngineering.createdAt})`);

    return result.map((r) => ({
      date: r.date,
      burstiness: r.avgBurstiness,
      ttr: r.avgTtr,
      avgSentLen: r.avgSentLen,
      avgParaLen: r.avgParaLen,
      count: r.count,
    }));
  },

  /**
   * 获取高质量 Prompt 排行
   */
  async getTopPrompts(limit: number = 10): Promise<PromptSuggestion[]> {
    const logs = await db
      .select({
        id: reverseEngineering.id,
        title: reverseEngineering.title,
        styleBlueprint: reverseEngineering.styleBlueprint,
        executionPrompt: reverseEngineering.executionPrompt,
        metricsTtr: reverseEngineering.metricsTtr,
        metricsBurstiness: reverseEngineering.metricsBurstiness,
      })
      .from(reverseEngineering)
      .where(and(
        isNull(reverseEngineering.deletedAt),
        sql`${reverseEngineering.executionPrompt} IS NOT NULL`,
        sql`${reverseEngineering.metricsTtr} IS NOT NULL`
      ))
      .orderBy(desc(reverseEngineering.createdAt))
      .limit(100);

    const withScores = logs.map((log) => {
      const blueprint = log.styleBlueprint as StyleBlueprint | null;
      let score = 50;
      if (log.metricsTtr) score += log.metricsTtr * 30;
      if (log.metricsBurstiness) score += Math.min(log.metricsBurstiness / 2, 20);
      return {
        id: log.id,
        title: log.title,
        category: blueprint?.category ?? null,
        styleName: blueprint?.style_name ?? null,
        executionPrompt: log.executionPrompt,
        qualityScore: Math.round(score),
      };
    });

    return withScores
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, limit);
  },

  /**
   * 获取分类分析洞察
   */
  async getCategoryInsights(category: string) {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        avgBurstiness: sql<number>`avg(${reverseEngineering.metricsBurstiness})`,
        avgTtr: sql<number>`avg(${reverseEngineering.metricsTtr})`,
        avgSentLen: sql<number>`avg(${reverseEngineering.metricsAvgSentLen})`,
        avgParaLen: sql<number>`avg(${reverseEngineering.metricsAvgParaLen})`,
        minBurstiness: sql<number>`min(${reverseEngineering.metricsBurstiness})`,
        maxBurstiness: sql<number>`max(${reverseEngineering.metricsBurstiness})`,
        minTtr: sql<number>`min(${reverseEngineering.metricsTtr})`,
        maxTtr: sql<number>`max(${reverseEngineering.metricsTtr})`,
      })
      .from(reverseEngineering)
      .where(and(
        sql`style_blueprint->>'category' = ${category}`,
        isNull(reverseEngineering.deletedAt)
      ));

    if (!stats || stats.total === 0) {
      return null;
    }

    return {
      category,
      totalAnalyses: stats.total,
      metrics: {
        burstiness: {
          avg: stats.avgBurstiness,
          min: stats.minBurstiness,
          max: stats.maxBurstiness,
        },
        ttr: {
          avg: stats.avgTtr,
          min: stats.minTtr,
          max: stats.maxTtr,
        },
        avgSentLen: {
          avg: stats.avgSentLen,
        },
        avgParaLen: {
          avg: stats.avgParaLen,
        },
      },
    };
  },
};

export type ReverseLogService = typeof reverseLogService;
