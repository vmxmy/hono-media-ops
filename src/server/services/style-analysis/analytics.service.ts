/**
 * Style Analysis Analytics Service
 * Handles user profiling, trends, and statistical insights
 */

import { eq, and, sql, gte } from "drizzle-orm";
import { db } from "@/server/db";
import { styleAnalyses, type LexicalLogicData } from "@/server/db/schema";
import type {
  UserStyleProfile,
  MetricsTrendPoint,
  PrimaryTypeInsights,
} from "./types";

// ==================== Analytics Service ====================

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
};

export type StyleAnalysisAnalyticsService = typeof styleAnalysisAnalyticsService;
