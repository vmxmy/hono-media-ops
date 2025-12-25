import { eq, desc, like, and, sql, inArray, isNull, gte, count, avg } from "drizzle-orm";
import { db } from "@/server/db";
import {
  reverseEngineeringLogs,
  type ReverseEngineeringLog,
  type ReverseResult,
  type ReverseMetrics,
} from "@/server/db/schema";

// ==================== Types ====================

export type ReverseLogStatus = "SUCCESS" | "FAILED" | "PENDING";

/** 用户写作风格画像 */
export interface UserStyleProfile {
  userId: string;
  totalAnalyses: number;
  successRate: number;
  /** 最常用的文体类型及占比 */
  topGenres: Array<{ genre: string; count: number; percentage: number }>;
  /** 平均指标 */
  averageMetrics: {
    burstiness: number | null;
    ttr: number | null;
    avgSentLen: number | null;
  };
  /** 常用词汇特征 (从 reverseResult.vocabulary 聚合) */
  commonVocabulary: string[];
  /** 最近分析时间 */
  lastAnalysisAt: Date | null;
}

/** Prompt 建议 */
export interface PromptSuggestion {
  id: string;
  articleTitle: string | null;
  genreCategory: string | null;
  finalSystemPrompt: string | null;
  metrics: ReverseMetrics | null;
  /** 基于成功率和指标的质量分数 */
  qualityScore: number;
}

/** 指标趋势数据点 */
export interface MetricsTrendPoint {
  date: string;
  burstiness: number | null;
  ttr: number | null;
  avgSentLen: number | null;
  count: number;
}

export interface GetAllReverseLogsOptions {
  page: number;
  pageSize: number;
  genreCategory?: string;
  status?: ReverseLogStatus;
  search?: string;
  userId?: string;
}

export interface CreateReverseLogInput {
  userId: string;
  articleTitle?: string;
  articleUrl?: string;
  originalContent?: string;
  genreCategory?: string;
  // JSONB fields
  reverseResult?: ReverseResult;
  metrics?: ReverseMetrics;
  // n8n writes to these columns
  reverseResultJson?: string;
  metricBurstiness?: number;
  metricTtr?: number;
  metricAvgSentLen?: number;
  finalSystemPrompt?: string;
  modelName?: string;
  status?: ReverseLogStatus;
}

// ==================== Helper Functions ====================

function parseReverseResult(input: CreateReverseLogInput): ReverseResult | undefined {
  if (input.reverseResult) return input.reverseResult;
  if (input.reverseResultJson) {
    try {
      return JSON.parse(input.reverseResultJson) as ReverseResult;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function buildMetrics(input: CreateReverseLogInput): ReverseMetrics | undefined {
  if (input.metrics) return input.metrics;
  if (input.metricBurstiness !== undefined ||
      input.metricTtr !== undefined ||
      input.metricAvgSentLen !== undefined) {
    return {
      burstiness: input.metricBurstiness,
      ttr: input.metricTtr,
      avgSentLen: input.metricAvgSentLen,
    };
  }
  return undefined;
}

// ==================== Service ====================

export const reverseLogService = {
  /**
   * Get all reverse engineering logs with pagination and filtering
   */
  async getAll(options: GetAllReverseLogsOptions) {
    const { page, pageSize, genreCategory, status, search, userId } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    // Exclude soft-deleted records
    conditions.push(isNull(reverseEngineeringLogs.deletedAt));

    if (genreCategory) {
      conditions.push(eq(reverseEngineeringLogs.genreCategory, genreCategory));
    }
    if (status) {
      conditions.push(eq(reverseEngineeringLogs.status, status));
    }
    if (search) {
      conditions.push(like(reverseEngineeringLogs.articleTitle, `%${search}%`));
    }
    if (userId) {
      conditions.push(eq(reverseEngineeringLogs.userId, userId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(reverseEngineeringLogs)
        .where(whereClause)
        .orderBy(desc(reverseEngineeringLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(reverseEngineeringLogs)
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
  async getById(id: string): Promise<ReverseEngineeringLog | null> {
    const [log] = await db
      .select()
      .from(reverseEngineeringLogs)
      .where(and(eq(reverseEngineeringLogs.id, id), isNull(reverseEngineeringLogs.deletedAt)))
      .limit(1);

    return log ?? null;
  },

  /**
   * Get logs by user ID
   */
  async getByUserId(userId: string): Promise<ReverseEngineeringLog[]> {
    return db
      .select()
      .from(reverseEngineeringLogs)
      .where(and(eq(reverseEngineeringLogs.userId, userId), isNull(reverseEngineeringLogs.deletedAt)))
      .orderBy(desc(reverseEngineeringLogs.createdAt));
  },

  /**
   * Create a new reverse engineering log
   */
  async create(input: CreateReverseLogInput): Promise<{ id: string; log: ReverseEngineeringLog }> {
    const reverseResult = parseReverseResult(input);
    const metrics = buildMetrics(input);

    const [log] = await db.insert(reverseEngineeringLogs).values({
      userId: input.userId,
      articleTitle: input.articleTitle,
      articleUrl: input.articleUrl,
      originalContent: input.originalContent,
      genreCategory: input.genreCategory,
      reverseResult,
      metrics,
      // n8n writes to these columns
      reverseResultJson: input.reverseResultJson ? JSON.parse(input.reverseResultJson) : undefined,
      metricBurstiness: input.metricBurstiness,
      metricTtr: input.metricTtr,
      metricAvgSentLen: input.metricAvgSentLen,
      finalSystemPrompt: input.finalSystemPrompt,
      modelName: input.modelName,
      status: input.status ?? "SUCCESS",
    }).returning();

    return { id: log!.id, log: log! };
  },

  /**
   * Soft delete a single log
   */
  async delete(id: string): Promise<{ success: boolean }> {
    await db
      .update(reverseEngineeringLogs)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(reverseEngineeringLogs.id, id));

    return { success: true };
  },

  /**
   * Hard delete a single log
   */
  async hardDelete(id: string): Promise<{ success: boolean }> {
    await db.delete(reverseEngineeringLogs).where(eq(reverseEngineeringLogs.id, id));
    return { success: true };
  },

  /**
   * Batch soft delete logs by IDs
   */
  async batchDelete(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
    if (ids.length === 0) return { success: true, deletedCount: 0 };

    await db
      .update(reverseEngineeringLogs)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(inArray(reverseEngineeringLogs.id, ids));

    return { success: true, deletedCount: ids.length };
  },

  /**
   * Restore a soft-deleted log
   */
  async restore(id: string): Promise<{ success: boolean }> {
    await db
      .update(reverseEngineeringLogs)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(reverseEngineeringLogs.id, id));

    return { success: true };
  },

  /**
   * Get all distinct genre categories
   */
  async getGenreCategories(): Promise<string[]> {
    const result = await db
      .selectDistinct({ genreCategory: reverseEngineeringLogs.genreCategory })
      .from(reverseEngineeringLogs)
      .where(and(
        sql`${reverseEngineeringLogs.genreCategory} IS NOT NULL`,
        isNull(reverseEngineeringLogs.deletedAt)
      ));

    return result.map((r) => r.genreCategory).filter((c): c is string => c !== null);
  },

  /**
   * Get statistics
   */
  async getStatistics(userId?: string) {
    const conditions = [isNull(reverseEngineeringLogs.deletedAt)];
    if (userId) {
      conditions.push(eq(reverseEngineeringLogs.userId, userId));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reverseEngineeringLogs)
      .where(whereClause);

    const statusCounts = await db
      .select({
        status: reverseEngineeringLogs.status,
        count: sql<number>`count(*)`,
      })
      .from(reverseEngineeringLogs)
      .where(whereClause)
      .groupBy(reverseEngineeringLogs.status);

    const genreCounts = await db
      .select({
        genre: reverseEngineeringLogs.genreCategory,
        count: sql<number>`count(*)`,
      })
      .from(reverseEngineeringLogs)
      .where(whereClause)
      .groupBy(reverseEngineeringLogs.genreCategory);

    return {
      total: totalResult?.count ?? 0,
      byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s.count])),
      byGenre: Object.fromEntries(
        genreCounts
          .filter((g) => g.genre !== null)
          .map((g) => [g.genre, g.count])
      ),
    };
  },

  /**
   * Export logs (optionally filtered by IDs)
   */
  async export(ids?: string[]): Promise<ReverseEngineeringLog[]> {
    if (ids && ids.length > 0) {
      return db
        .select()
        .from(reverseEngineeringLogs)
        .where(and(inArray(reverseEngineeringLogs.id, ids), isNull(reverseEngineeringLogs.deletedAt)));
    }

    return db
      .select()
      .from(reverseEngineeringLogs)
      .where(isNull(reverseEngineeringLogs.deletedAt))
      .orderBy(desc(reverseEngineeringLogs.createdAt));
  },

  // ==================== Domain Methods ====================

  /**
   * 获取用户写作风格画像
   * 聚合用户所有分析结果，提取风格特征
   */
  async getUserStyleProfile(userId: string): Promise<UserStyleProfile | null> {
    const baseConditions = and(
      eq(reverseEngineeringLogs.userId, userId),
      isNull(reverseEngineeringLogs.deletedAt)
    );

    // 获取总数和成功数
    const [statsResult] = await db
      .select({
        total: sql<number>`count(*)`,
        successCount: sql<number>`count(*) filter (where ${reverseEngineeringLogs.status} = 'SUCCESS')`,
        avgBurstiness: sql<number>`avg((${reverseEngineeringLogs.metrics}->>'burstiness')::numeric)`,
        avgTtr: sql<number>`avg((${reverseEngineeringLogs.metrics}->>'ttr')::numeric)`,
        avgSentLen: sql<number>`avg((${reverseEngineeringLogs.metrics}->>'avgSentLen')::numeric)`,
        lastAnalysis: sql<Date>`max(${reverseEngineeringLogs.createdAt})`,
      })
      .from(reverseEngineeringLogs)
      .where(baseConditions);

    if (!statsResult || statsResult.total === 0) {
      return null;
    }

    // 获取文体分布
    const genreDistribution = await db
      .select({
        genre: reverseEngineeringLogs.genreCategory,
        count: sql<number>`count(*)`,
      })
      .from(reverseEngineeringLogs)
      .where(and(baseConditions, sql`${reverseEngineeringLogs.genreCategory} IS NOT NULL`))
      .groupBy(reverseEngineeringLogs.genreCategory)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    // 聚合词汇特征 (从 vocabulary 数组中提取高频词)
    const vocabularyResult = await db
      .select({
        vocabulary: reverseEngineeringLogs.reverseResult,
      })
      .from(reverseEngineeringLogs)
      .where(and(
        baseConditions,
        eq(reverseEngineeringLogs.status, "SUCCESS"),
        sql`${reverseEngineeringLogs.reverseResult}->'vocabulary' IS NOT NULL`
      ))
      .limit(20);

    // 统计词频
    const wordFrequency: Record<string, number> = {};
    for (const row of vocabularyResult) {
      const result = row.vocabulary as ReverseResult | null;
      if (result?.vocabulary) {
        for (const word of result.vocabulary) {
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
      successRate: statsResult.total > 0 ? statsResult.successCount / statsResult.total : 0,
      topGenres: genreDistribution.map((g) => ({
        genre: g.genre!,
        count: g.count,
        percentage: statsResult.total > 0 ? g.count / statsResult.total : 0,
      })),
      averageMetrics: {
        burstiness: statsResult.avgBurstiness,
        ttr: statsResult.avgTtr,
        avgSentLen: statsResult.avgSentLen,
      },
      commonVocabulary,
      lastAnalysisAt: statsResult.lastAnalysis,
    };
  },

  /**
   * 获取特定文体的 Prompt 建议
   * 基于历史成功案例，返回质量较高的 prompt
   */
  async getPromptSuggestions(
    genreCategory: string,
    limit: number = 5
  ): Promise<PromptSuggestion[]> {
    const logs = await db
      .select({
        id: reverseEngineeringLogs.id,
        articleTitle: reverseEngineeringLogs.articleTitle,
        genreCategory: reverseEngineeringLogs.genreCategory,
        finalSystemPrompt: reverseEngineeringLogs.finalSystemPrompt,
        metrics: reverseEngineeringLogs.metrics,
      })
      .from(reverseEngineeringLogs)
      .where(and(
        eq(reverseEngineeringLogs.genreCategory, genreCategory),
        eq(reverseEngineeringLogs.status, "SUCCESS"),
        isNull(reverseEngineeringLogs.deletedAt),
        sql`${reverseEngineeringLogs.finalSystemPrompt} IS NOT NULL`
      ))
      .orderBy(desc(reverseEngineeringLogs.createdAt))
      .limit(limit * 2); // 获取更多以便排序

    // 计算质量分数并排序
    const withScores = logs.map((log) => {
      const metrics = log.metrics as ReverseMetrics | null;
      // 质量分数：基于 TTR (词汇丰富度) 和 burstiness (节奏变化)
      let score = 50; // 基础分
      if (metrics?.ttr) score += metrics.ttr * 30; // TTR 0-1, 贡献 0-30 分
      if (metrics?.burstiness) score += Math.min(metrics.burstiness / 2, 20); // burstiness 贡献 0-20 分
      return { ...log, qualityScore: Math.round(score) };
    });

    return withScores
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, limit);
  },

  /**
   * 获取用户指标趋势
   * 返回按日期聚合的指标变化数据
   */
  async getMetricsTrend(
    userId: string,
    days: number = 30
  ): Promise<MetricsTrendPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db
      .select({
        date: sql<string>`date(${reverseEngineeringLogs.createdAt})`,
        avgBurstiness: sql<number>`avg((${reverseEngineeringLogs.metrics}->>'burstiness')::numeric)`,
        avgTtr: sql<number>`avg((${reverseEngineeringLogs.metrics}->>'ttr')::numeric)`,
        avgSentLen: sql<number>`avg((${reverseEngineeringLogs.metrics}->>'avgSentLen')::numeric)`,
        count: sql<number>`count(*)`,
      })
      .from(reverseEngineeringLogs)
      .where(and(
        eq(reverseEngineeringLogs.userId, userId),
        eq(reverseEngineeringLogs.status, "SUCCESS"),
        isNull(reverseEngineeringLogs.deletedAt),
        gte(reverseEngineeringLogs.createdAt, startDate)
      ))
      .groupBy(sql`date(${reverseEngineeringLogs.createdAt})`)
      .orderBy(sql`date(${reverseEngineeringLogs.createdAt})`);

    return result.map((r) => ({
      date: r.date,
      burstiness: r.avgBurstiness,
      ttr: r.avgTtr,
      avgSentLen: r.avgSentLen,
      count: r.count,
    }));
  },

  /**
   * 查找相似文章
   * 基于文体和指标相似度查找
   */
  async findSimilarArticles(
    articleId: string,
    limit: number = 5
  ): Promise<Array<ReverseEngineeringLog & { similarityScore: number }>> {
    // 获取源文章
    const [source] = await db
      .select()
      .from(reverseEngineeringLogs)
      .where(eq(reverseEngineeringLogs.id, articleId))
      .limit(1);

    if (!source) return [];

    const sourceMetrics = source.metrics as ReverseMetrics | null;

    // 查找同文体的文章
    const candidates = await db
      .select()
      .from(reverseEngineeringLogs)
      .where(and(
        sql`${reverseEngineeringLogs.id} != ${articleId}`,
        eq(reverseEngineeringLogs.status, "SUCCESS"),
        isNull(reverseEngineeringLogs.deletedAt),
        source.genreCategory
          ? eq(reverseEngineeringLogs.genreCategory, source.genreCategory)
          : sql`true`
      ))
      .orderBy(desc(reverseEngineeringLogs.createdAt))
      .limit(50);

    // 计算相似度分数
    const withSimilarity = candidates.map((candidate) => {
      const candidateMetrics = candidate.metrics as ReverseMetrics | null;
      let similarity = 0;
      let factors = 0;

      // 文体相同加分
      if (candidate.genreCategory === source.genreCategory) {
        similarity += 30;
        factors++;
      }

      // 指标相似度
      if (sourceMetrics && candidateMetrics) {
        if (sourceMetrics.burstiness !== undefined && candidateMetrics.burstiness !== undefined) {
          const diff = Math.abs(sourceMetrics.burstiness - candidateMetrics.burstiness);
          similarity += Math.max(0, 25 - diff);
          factors++;
        }
        if (sourceMetrics.ttr !== undefined && candidateMetrics.ttr !== undefined) {
          const diff = Math.abs(sourceMetrics.ttr - candidateMetrics.ttr);
          similarity += Math.max(0, 25 - diff * 50);
          factors++;
        }
        if (sourceMetrics.avgSentLen !== undefined && candidateMetrics.avgSentLen !== undefined) {
          const diff = Math.abs(sourceMetrics.avgSentLen - candidateMetrics.avgSentLen);
          similarity += Math.max(0, 20 - diff);
          factors++;
        }
      }

      return {
        ...candidate,
        similarityScore: factors > 0 ? Math.round(similarity / factors * 100) / 100 : 0,
      };
    });

    return withSimilarity
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  },

  /**
   * 获取高质量 Prompt 排行
   * 跨文体的优质 prompt 推荐
   */
  async getTopPrompts(limit: number = 10): Promise<PromptSuggestion[]> {
    const logs = await db
      .select({
        id: reverseEngineeringLogs.id,
        articleTitle: reverseEngineeringLogs.articleTitle,
        genreCategory: reverseEngineeringLogs.genreCategory,
        finalSystemPrompt: reverseEngineeringLogs.finalSystemPrompt,
        metrics: reverseEngineeringLogs.metrics,
      })
      .from(reverseEngineeringLogs)
      .where(and(
        eq(reverseEngineeringLogs.status, "SUCCESS"),
        isNull(reverseEngineeringLogs.deletedAt),
        sql`${reverseEngineeringLogs.finalSystemPrompt} IS NOT NULL`,
        sql`${reverseEngineeringLogs.metrics} IS NOT NULL`
      ))
      .orderBy(desc(reverseEngineeringLogs.createdAt))
      .limit(100);

    const withScores = logs.map((log) => {
      const metrics = log.metrics as ReverseMetrics | null;
      let score = 50;
      if (metrics?.ttr) score += metrics.ttr * 30;
      if (metrics?.burstiness) score += Math.min(metrics.burstiness / 2, 20);
      return { ...log, qualityScore: Math.round(score) };
    });

    return withScores
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, limit);
  },

  /**
   * 获取文体分析洞察
   * 返回特定文体的统计洞察
   */
  async getGenreInsights(genreCategory: string) {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        successCount: sql<number>`count(*) filter (where ${reverseEngineeringLogs.status} = 'SUCCESS')`,
        avgBurstiness: sql<number>`avg((${reverseEngineeringLogs.metrics}->>'burstiness')::numeric)`,
        avgTtr: sql<number>`avg((${reverseEngineeringLogs.metrics}->>'ttr')::numeric)`,
        avgSentLen: sql<number>`avg((${reverseEngineeringLogs.metrics}->>'avgSentLen')::numeric)`,
        minBurstiness: sql<number>`min((${reverseEngineeringLogs.metrics}->>'burstiness')::numeric)`,
        maxBurstiness: sql<number>`max((${reverseEngineeringLogs.metrics}->>'burstiness')::numeric)`,
        minTtr: sql<number>`min((${reverseEngineeringLogs.metrics}->>'ttr')::numeric)`,
        maxTtr: sql<number>`max((${reverseEngineeringLogs.metrics}->>'ttr')::numeric)`,
      })
      .from(reverseEngineeringLogs)
      .where(and(
        eq(reverseEngineeringLogs.genreCategory, genreCategory),
        isNull(reverseEngineeringLogs.deletedAt)
      ));

    if (!stats || stats.total === 0) {
      return null;
    }

    return {
      genreCategory,
      totalAnalyses: stats.total,
      successRate: stats.successCount / stats.total,
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
      },
    };
  },
};

export type ReverseLogService = typeof reverseLogService;
