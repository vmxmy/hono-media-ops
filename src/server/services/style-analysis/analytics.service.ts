/**
 * Style Analysis Analytics Service
 * Handles user profiling, trends, and statistical insights
 */

import { eq, and, desc, sql, gte } from "drizzle-orm";
import { db } from "@/server/db";
import { styleAnalyses, pipelines, imagePrompts, type LexicalLogicData } from "@/server/db/schema";
import type {
  UserStyleProfile,
  MetricsTrendPoint,
  PrimaryTypeInsights,
} from "./types";

// ==================== Analytics Service ====================

// ==================== Additional Imports ====================
import { tasks } from "@/server/db/schema";

export const styleAnalysisAnalyticsService = {
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

  async getDetailedMetrics(userId: string) {
    const analyses = await db
      .select({
        id: styleAnalyses.id,
        sourceTitle: styleAnalyses.sourceTitle,
        wordCount: styleAnalyses.wordCount,
        paraCount: styleAnalyses.paraCount,
        metricsTtr: styleAnalyses.metricsTtr,
        metricsBurstiness: styleAnalyses.metricsBurstiness,
        primaryType: styleAnalyses.primaryType,
        createdAt: styleAnalyses.createdAt,
      })
      .from(styleAnalyses)
      .where(and(eq(styleAnalyses.userId, userId), sql`${styleAnalyses.deletedAt} IS NULL`))
      .orderBy(desc(styleAnalyses.createdAt));

    return analyses;
  },

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
  async getPrimaryTypeInsights(primaryType: string): Promise<PrimaryTypeInsights | null> {
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

  /**
   * 按时间段聚合指标统计
   */
  async getMetricsByTimeRange(
    userId: string,
    granularity: 'week' | 'month',
    startDate: Date,
    endDate: Date
  ) {
    // 根据粒度选择日期格式化函数
    const dateFormat = granularity === 'week'
      ? sql`TO_CHAR(${styleAnalyses.createdAt}, 'IYYY-IW')`  // ISO week format: 2024-W01
      : sql`TO_CHAR(${styleAnalyses.createdAt}, 'YYYY-MM')`;  // Month format: 2024-01

    const baseConditions = and(
      eq(styleAnalyses.userId, userId),
      sql`${styleAnalyses.deletedAt} IS NULL`,
      sql`${styleAnalyses.createdAt} >= ${startDate}`,
      sql`${styleAnalyses.createdAt} <= ${endDate}`
    );

    // 获取每个时间段的聚合数据
    const periodsData = await db
      .select({
        period: dateFormat.as('period'),
        totalAnalyses: sql<number>`count(*)`,
        avgWordCount: sql<number>`avg(${styleAnalyses.wordCount})`,
        avgParaCount: sql<number>`avg(${styleAnalyses.paraCount})`,
        avgBurstiness: sql<number>`avg(${styleAnalyses.metricsBurstiness})`,
        avgTtr: sql<number>`avg(${styleAnalyses.metricsTtr})`,
      })
      .from(styleAnalyses)
      .where(baseConditions)
      .groupBy(dateFormat)
      .orderBy(dateFormat);

    // 获取每个时间段的类型分布
    const typesByPeriod = await db
      .select({
        period: dateFormat.as('period'),
        primaryType: styleAnalyses.primaryType,
        count: sql<number>`count(*)`,
      })
      .from(styleAnalyses)
      .where(and(baseConditions, sql`${styleAnalyses.primaryType} IS NOT NULL`))
      .groupBy(dateFormat, styleAnalyses.primaryType)
      .orderBy(dateFormat, desc(sql`count(*)`));

    // 组合数据
    const periodsMap = new Map(
      periodsData.map((p) => [
        p.period,
        {
          period: p.period,
          totalAnalyses: p.totalAnalyses,
          avgMetrics: {
            wordCount: p.avgWordCount ?? 0,
            paraCount: p.avgParaCount ?? 0,
            burstiness: p.avgBurstiness ?? 0,
            ttr: p.avgTtr ?? 0,
          },
          topTypes: [] as Array<{ type: string; count: number }>,
        },
      ])
    );

    // 添加类型分布（每个时间段取前3个）
    for (const typeData of typesByPeriod) {
      const periodData = periodsMap.get(typeData.period);
      if (periodData && periodData.topTypes.length < 3 && typeData.primaryType) {
        periodData.topTypes.push({
          type: typeData.primaryType,
          count: typeData.count,
        });
      }
    }

    return Array.from(periodsMap.values());
  },

  /**
   * 获取用户使用模式洞察
   */
  async getUserUsagePattern(userId: string) {
    const baseConditions = and(
      eq(styleAnalyses.userId, userId),
      sql`${styleAnalyses.deletedAt} IS NULL`
    );

    // 1. 获取最活跃的小时（按小时统计）
    const hourlyActivity = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${styleAnalyses.createdAt})::int`,
        count: sql<number>`count(*)`,
      })
      .from(styleAnalyses)
      .where(baseConditions)
      .groupBy(sql`EXTRACT(HOUR FROM ${styleAnalyses.createdAt})`)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    // 2. 获取最活跃的星期几（0=Sunday, 6=Saturday）
    const dailyActivity = await db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM ${styleAnalyses.createdAt})::int`,
        count: sql<number>`count(*)`,
      })
      .from(styleAnalyses)
      .where(baseConditions)
      .groupBy(sql`EXTRACT(DOW FROM ${styleAnalyses.createdAt})`)
      .orderBy(desc(sql`count(*)`))
      .limit(7);

    // 3. 计算每周平均分析数
    const [timeSpan] = await db
      .select({
        firstAnalysis: sql<Date>`min(${styleAnalyses.createdAt})`,
        lastAnalysis: sql<Date>`max(${styleAnalyses.createdAt})`,
        totalCount: sql<number>`count(*)`,
      })
      .from(styleAnalyses)
      .where(baseConditions);

    let avgAnalysesPerWeek = 0;
    if (timeSpan?.firstAnalysis && timeSpan?.lastAnalysis) {
      const daysDiff = Math.max(
        1,
        Math.ceil(
          (timeSpan.lastAnalysis.getTime() - timeSpan.firstAnalysis.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      const weeks = daysDiff / 7;
      avgAnalysesPerWeek = weeks > 0 ? (timeSpan.totalCount ?? 0) / weeks : 0;
    }

    // 4. 获取偏好类型（带百分比）
    const [totalResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(styleAnalyses)
      .where(baseConditions);

    const total = totalResult?.total ?? 0;

    const preferredTypes = await db
      .select({
        type: styleAnalyses.primaryType,
        count: sql<number>`count(*)`,
      })
      .from(styleAnalyses)
      .where(and(baseConditions, sql`${styleAnalyses.primaryType} IS NOT NULL`))
      .groupBy(styleAnalyses.primaryType)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    // 5. 计算风格一致性（基于类型分布的熵）
    let styleConsistency = 0;
    if (total > 0 && preferredTypes.length > 0) {
      // 使用香农熵的反向值作为一致性指标
      // 熵越低，一致性越高
      const entropy = preferredTypes.reduce((sum, t) => {
        const p = t.count / total;
        return sum - p * Math.log2(p);
      }, 0);
      // 归一化到 0-1，最大熵为 log2(类型数)
      const maxEntropy = Math.log2(preferredTypes.length);
      styleConsistency = maxEntropy > 0 ? 1 - entropy / maxEntropy : 0;
    }

    return {
      mostActiveHours: hourlyActivity.map((h) => ({
        hour: h.hour,
        count: h.count,
      })),
      mostActiveDays: dailyActivity.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        count: d.count,
      })),
      avgAnalysesPerWeek: Math.round(avgAnalysesPerWeek * 100) / 100,
      preferredTypes: preferredTypes
        .filter((t) => t.type !== null)
        .map((t) => ({
          type: t.type!,
          count: t.count,
          percentage: total > 0 ? Math.round((t.count / total) * 10000) / 100 : 0,
        })),
      styleConsistency: Math.round(styleConsistency * 100) / 100,
    };
  },

  /**
   * 获取最常用的风格分析
   */
  async getTopUsedStyles(
    userId?: string,
    limit: number = 10,
    timeRange?: { start: Date; end: Date }
  ) {
    const conditions = [sql`${styleAnalyses.deletedAt} IS NULL`];

    if (userId) {
      conditions.push(eq(styleAnalyses.userId, userId));
    }

    if (timeRange) {
      conditions.push(
        and(
          gte(styleAnalyses.createdAt, timeRange.start),
          sql`${styleAnalyses.createdAt} <= ${timeRange.end}`
        )!
      );
    }

    const whereClause = and(...conditions);

    const results = await db
      .select({
        id: styleAnalyses.id,
        sourceTitle: styleAnalyses.sourceTitle,
        styleName: styleAnalyses.styleName,
        primaryType: styleAnalyses.primaryType,
        wordCount: styleAnalyses.wordCount,
        metricsTtr: styleAnalyses.metricsTtr,
        metricsBurstiness: styleAnalyses.metricsBurstiness,
        createdAt: styleAnalyses.createdAt,
        useCount: sql<number>`(
          SELECT count(*)::int
          FROM ${tasks}
          WHERE ${tasks.refMaterialId} = "style_analyses"."id"
            AND ${tasks.deletedAt} IS NULL
        )`.as("use_count"),
        lastUsedAt: sql<Date | null>`(
          SELECT max(${tasks.createdAt})
          FROM ${tasks}
          WHERE ${tasks.refMaterialId} = "style_analyses"."id"
            AND ${tasks.deletedAt} IS NULL
        )`.as("last_used_at"),
      })
      .from(styleAnalyses)
      .where(whereClause)
      .orderBy(
        desc(sql<number>`(
          SELECT count(*)::int
          FROM ${tasks}
          WHERE ${tasks.refMaterialId} = "style_analyses"."id"
            AND ${tasks.deletedAt} IS NULL
        )`),
        desc(styleAnalyses.createdAt)
      )
      .limit(limit);

    return results.map((r) => ({
      id: r.id,
      sourceTitle: r.sourceTitle ?? "Untitled",
      styleName: r.styleName ?? "Unknown Style",
      primaryType: r.primaryType ?? "Unknown",
      useCount: r.useCount,
      lastUsedAt: r.lastUsedAt,
      avgMetrics: {
        wordCount: r.wordCount ?? 0,
        ttr: r.metricsTtr ?? 0,
        burstiness: r.metricsBurstiness ?? 0,
      },
    }));
  },

  /**
   * 获取风格-提示词组合分析
   * 分析哪些风格和提示词组合效果最好
   */
  async getStylePromptCombinations(
    userId?: string,
    limit: number = 10,
    timeRange?: { start: Date; end: Date }
  ) {
    const conditions = [sql`${pipelines.deletedAt} IS NULL`];

    if (userId) {
      conditions.push(eq(pipelines.userId, userId));
    }

    if (timeRange) {
      conditions.push(
        and(
          gte(pipelines.createdAt, timeRange.start),
          sql`${pipelines.createdAt} <= ${timeRange.end}`
        )!
      );
    }

    // 确保有 styleAnalysisId 和 imagePromptId
    conditions.push(sql`${pipelines.styleAnalysisId} IS NOT NULL`);
    conditions.push(sql`${pipelines.imagePromptId} IS NOT NULL`);

    const whereClause = and(...conditions);

    const results = await db
      .select({
        styleAnalysisId: pipelines.styleAnalysisId,
        imagePromptId: pipelines.imagePromptId,
        styleTitle: styleAnalyses.sourceTitle,
        styleName: styleAnalyses.styleName,
        promptTitle: imagePrompts.title,
        totalUses: sql<number>`count(*)`,
        successCount: sql<number>`count(*) FILTER (WHERE ${pipelines.status} = 'completed')`,
        failureCount: sql<number>`count(*) FILTER (WHERE ${pipelines.status} = 'failed')`,
        avgArticleChapters: sql<number>`avg(${pipelines.articleTotalChapters})`,
        avgXhsImages: sql<number>`avg(${pipelines.xhsTotalImages})`,
      })
      .from(pipelines)
      .innerJoin(styleAnalyses, eq(pipelines.styleAnalysisId, styleAnalyses.id))
      .innerJoin(imagePrompts, eq(pipelines.imagePromptId, imagePrompts.id))
      .where(whereClause)
      .groupBy(
        pipelines.styleAnalysisId,
        pipelines.imagePromptId,
        styleAnalyses.sourceTitle,
        styleAnalyses.styleName,
        imagePrompts.title
      )
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return results.map((r) => ({
      styleAnalysisId: r.styleAnalysisId!,
      imagePromptId: r.imagePromptId!,
      styleTitle: r.styleTitle ?? "Unknown Style",
      styleName: r.styleName ?? "Unknown",
      promptTitle: r.promptTitle,
      totalUses: r.totalUses,
      successRate: r.totalUses > 0 ? r.successCount / r.totalUses : 0,
      failureRate: r.totalUses > 0 ? r.failureCount / r.totalUses : 0,
      avgArticleChapters: r.avgArticleChapters ?? 0,
      avgXhsImages: r.avgXhsImages ?? 0,
    }));
  },

  /**
   * 比较用户指标与全局平均值
   * 帮助用户了解自己的写作风格相对于整体水平的位置
   */
  async compareMetricsWithAverage(userId: string) {
    const baseConditions = and(
      eq(styleAnalyses.userId, userId),
      sql`${styleAnalyses.deletedAt} IS NULL`
    );

    // 获取用户的平均指标
    const [userMetrics] = await db
      .select({
        avgWordCount: sql<number>`avg(${styleAnalyses.wordCount})`,
        avgParaCount: sql<number>`avg(${styleAnalyses.paraCount})`,
        avgBurstiness: sql<number>`avg(${styleAnalyses.metricsBurstiness})`,
        avgTtr: sql<number>`avg(${styleAnalyses.metricsTtr})`,
        avgSentLen: sql<number>`avg(${styleAnalyses.metricsAvgSentLen})`,
        totalAnalyses: sql<number>`count(*)`,
      })
      .from(styleAnalyses)
      .where(baseConditions);

    // 获取全局平均指标
    const [globalMetrics] = await db
      .select({
        avgWordCount: sql<number>`avg(${styleAnalyses.wordCount})`,
        avgParaCount: sql<number>`avg(${styleAnalyses.paraCount})`,
        avgBurstiness: sql<number>`avg(${styleAnalyses.metricsBurstiness})`,
        avgTtr: sql<number>`avg(${styleAnalyses.metricsTtr})`,
        avgSentLen: sql<number>`avg(${styleAnalyses.metricsAvgSentLen})`,
        totalAnalyses: sql<number>`count(*)`,
      })
      .from(styleAnalyses)
      .where(sql`${styleAnalyses.deletedAt} IS NULL`);

    if (!userMetrics || !globalMetrics) {
      return null;
    }

    // 计算百分比差异
    const calculateDiff = (userVal: number, globalVal: number) => {
      if (globalVal === 0) return 0;
      return ((userVal - globalVal) / globalVal) * 100;
    };

    return {
      userId,
      userMetrics: {
        wordCount: userMetrics.avgWordCount ?? 0,
        paraCount: userMetrics.avgParaCount ?? 0,
        burstiness: userMetrics.avgBurstiness ?? 0,
        ttr: userMetrics.avgTtr ?? 0,
        avgSentLen: userMetrics.avgSentLen ?? 0,
        totalAnalyses: userMetrics.totalAnalyses,
      },
      globalMetrics: {
        wordCount: globalMetrics.avgWordCount ?? 0,
        paraCount: globalMetrics.avgParaCount ?? 0,
        burstiness: globalMetrics.avgBurstiness ?? 0,
        ttr: globalMetrics.avgTtr ?? 0,
        avgSentLen: globalMetrics.avgSentLen ?? 0,
        totalAnalyses: globalMetrics.totalAnalyses,
      },
      comparison: {
        wordCountDiff: calculateDiff(
          userMetrics.avgWordCount ?? 0,
          globalMetrics.avgWordCount ?? 0
        ),
        paraCountDiff: calculateDiff(
          userMetrics.avgParaCount ?? 0,
          globalMetrics.avgParaCount ?? 0
        ),
        burstinessDiff: calculateDiff(
          userMetrics.avgBurstiness ?? 0,
          globalMetrics.avgBurstiness ?? 0
        ),
        ttrDiff: calculateDiff(
          userMetrics.avgTtr ?? 0,
          globalMetrics.avgTtr ?? 0
        ),
        avgSentLenDiff: calculateDiff(
          userMetrics.avgSentLen ?? 0,
          globalMetrics.avgSentLen ?? 0
        ),
      },
    };
  },
};

export type StyleAnalysisAnalyticsService = typeof styleAnalysisAnalyticsService;
