import { eq, and, gte, sql, desc, isNull, count } from "drizzle-orm";
import { db } from "@/server/db";
import { pipelines } from "@/server/db/schema";

// ==================== Types ====================

export interface PipelineOverview {
  totalPipelines: number;
  analyzingCount: number;
  pendingSelectionCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  completionRate: number;
  avgArticleProgress: number;
  avgXhsProgress: number;
}

export interface PipelineStatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface PipelineCreationTrend {
  date: string;
  count: number;
  cumulativeCount: number;
}

export interface PipelineCompletionTrend {
  date: string;
  count: number;
  avgCompletionTime: number;
}

export interface PipelineProgressAnalysis {
  totalWithArticles: number;
  totalWithXhs: number;
  avgArticleProgress: number;
  avgXhsProgress: number;
  fullyCompletedArticles: number;
  fullyCompletedXhs: number;
}

export interface PipelineTopSource {
  sourceUrl: string;
  count: number;
  successCount: number;
  successRate: number;
}

export interface PipelineTopTopic {
  topic: string;
  count: number;
  avgWordCount: number;
}

export interface PipelineTopKeyword {
  keyword: string;
  count: number;
}

export interface PipelinePerformanceMetrics {
  avgTimeToComplete: number;
  successRate: number;
  failureRate: number;
  avgArticleChapters: number;
  avgXhsImages: number;
}

// ==================== Service ====================

export const pipelineAnalyticsService = {
  /**
   * Get overview statistics
   */
  async getOverview(userId: string): Promise<PipelineOverview> {
    const result = await db
      .select({
        totalPipelines: count(),
        analyzingCount: sql<number>`count(*) filter (where ${pipelines.status} = 'analyzing')::int`,
        pendingSelectionCount: sql<number>`count(*) filter (where ${pipelines.status} = 'pending_selection')::int`,
        processingCount: sql<number>`count(*) filter (where ${pipelines.status} = 'processing')::int`,
        completedCount: sql<number>`count(*) filter (where ${pipelines.status} = 'completed')::int`,
        failedCount: sql<number>`count(*) filter (where ${pipelines.status} = 'failed')::int`,
        avgArticleProgress: sql<number>`AVG(CASE WHEN ${pipelines.articleTotalChapters} > 0 THEN ${pipelines.articleCompletedChapters}::float / ${pipelines.articleTotalChapters} * 100 ELSE 0 END)::float`,
        avgXhsProgress: sql<number>`AVG(CASE WHEN ${pipelines.xhsTotalImages} > 0 THEN ${pipelines.xhsCompletedImages}::float / ${pipelines.xhsTotalImages} * 100 ELSE 0 END)::float`,
      })
      .from(pipelines)
      .where(and(eq(pipelines.userId, userId), isNull(pipelines.deletedAt)));

    const data = result[0];
    if (!data) {
      return {
        totalPipelines: 0,
        analyzingCount: 0,
        pendingSelectionCount: 0,
        processingCount: 0,
        completedCount: 0,
        failedCount: 0,
        completionRate: 0,
        avgArticleProgress: 0,
        avgXhsProgress: 0,
      };
    }

    const totalPipelines = Number(data.totalPipelines) || 0;
    const completedCount = data.completedCount || 0;

    return {
      totalPipelines,
      analyzingCount: data.analyzingCount || 0,
      pendingSelectionCount: data.pendingSelectionCount || 0,
      processingCount: data.processingCount || 0,
      completedCount,
      failedCount: data.failedCount || 0,
      completionRate: totalPipelines > 0 ? (completedCount / totalPipelines) * 100 : 0,
      avgArticleProgress: data.avgArticleProgress || 0,
      avgXhsProgress: data.avgXhsProgress || 0,
    };
  },

  /**
   * Get status distribution
   */
  async getStatusDistribution(userId: string): Promise<PipelineStatusDistribution[]> {
    const results = await db
      .select({
        status: pipelines.status,
        count: count(),
      })
      .from(pipelines)
      .where(and(eq(pipelines.userId, userId), isNull(pipelines.deletedAt)))
      .groupBy(pipelines.status)
      .orderBy(desc(count()));

    const total = results.reduce((sum, row) => sum + Number(row.count), 0);

    return results.map((row) => ({
      status: row.status,
      count: Number(row.count),
      percentage: total > 0 ? (Number(row.count) / total) * 100 : 0,
    }));
  },

  /**
   * Get creation trend
   */
  async getCreationTrend(userId: string, days: number = 30): Promise<PipelineCreationTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`date(${pipelines.createdAt})`,
        count: count(),
      })
      .from(pipelines)
      .where(
        and(
          eq(pipelines.userId, userId),
          isNull(pipelines.deletedAt),
          gte(pipelines.createdAt, startDate)
        )
      )
      .groupBy(sql`date(${pipelines.createdAt})`)
      .orderBy(sql`date(${pipelines.createdAt})`);

    let cumulative = 0;
    return results.map((row) => {
      cumulative += Number(row.count);
      return {
        date: row.date,
        count: Number(row.count),
        cumulativeCount: cumulative,
      };
    });
  },

  /**
   * Get completion trend
   */
  async getCompletionTrend(userId: string, days: number = 30): Promise<PipelineCompletionTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`date(${pipelines.updatedAt})`,
        count: count(),
        avgCompletionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${pipelines.updatedAt} - ${pipelines.createdAt})))::float`,
      })
      .from(pipelines)
      .where(
        and(
          eq(pipelines.userId, userId),
          eq(pipelines.status, "completed"),
          isNull(pipelines.deletedAt),
          gte(pipelines.updatedAt, startDate)
        )
      )
      .groupBy(sql`date(${pipelines.updatedAt})`)
      .orderBy(sql`date(${pipelines.updatedAt})`);

    return results.map((row) => ({
      date: row.date,
      count: Number(row.count),
      avgCompletionTime: row.avgCompletionTime || 0,
    }));
  },

  /**
   * Get progress analysis
   */
  async getProgressAnalysis(userId: string): Promise<PipelineProgressAnalysis> {
    const result = await db
      .select({
        totalWithArticles: sql<number>`count(*) filter (where ${pipelines.articleTotalChapters} > 0)::int`,
        totalWithXhs: sql<number>`count(*) filter (where ${pipelines.xhsTotalImages} > 0)::int`,
        avgArticleProgress: sql<number>`AVG(CASE WHEN ${pipelines.articleTotalChapters} > 0 THEN ${pipelines.articleCompletedChapters}::float / ${pipelines.articleTotalChapters} * 100 ELSE 0 END)::float`,
        avgXhsProgress: sql<number>`AVG(CASE WHEN ${pipelines.xhsTotalImages} > 0 THEN ${pipelines.xhsCompletedImages}::float / ${pipelines.xhsTotalImages} * 100 ELSE 0 END)::float`,
        fullyCompletedArticles: sql<number>`count(*) filter (where ${pipelines.articleTotalChapters} > 0 AND ${pipelines.articleCompletedChapters} = ${pipelines.articleTotalChapters})::int`,
        fullyCompletedXhs: sql<number>`count(*) filter (where ${pipelines.xhsTotalImages} > 0 AND ${pipelines.xhsCompletedImages} = ${pipelines.xhsTotalImages})::int`,
      })
      .from(pipelines)
      .where(and(eq(pipelines.userId, userId), isNull(pipelines.deletedAt)));

    const data = result[0];
    if (!data) {
      return {
        totalWithArticles: 0,
        totalWithXhs: 0,
        avgArticleProgress: 0,
        avgXhsProgress: 0,
        fullyCompletedArticles: 0,
        fullyCompletedXhs: 0,
      };
    }

    return {
      totalWithArticles: data.totalWithArticles || 0,
      totalWithXhs: data.totalWithXhs || 0,
      avgArticleProgress: data.avgArticleProgress || 0,
      avgXhsProgress: data.avgXhsProgress || 0,
      fullyCompletedArticles: data.fullyCompletedArticles || 0,
      fullyCompletedXhs: data.fullyCompletedXhs || 0,
    };
  },

  /**
   * Get top sources
   */
  async getTopSources(userId: string, limit: number = 10): Promise<PipelineTopSource[]> {
    const results = await db
      .select({
        sourceUrl: pipelines.sourceUrl,
        count: count(),
        successCount: sql<number>`count(*) filter (where ${pipelines.status} = 'completed')::int`,
      })
      .from(pipelines)
      .where(and(eq(pipelines.userId, userId), isNull(pipelines.deletedAt)))
      .groupBy(pipelines.sourceUrl)
      .orderBy(desc(count()))
      .limit(limit);

    return results.map((row) => {
      const totalCount = Number(row.count);
      const successCount = row.successCount || 0;
      return {
        sourceUrl: row.sourceUrl,
        count: totalCount,
        successCount,
        successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
      };
    });
  },

  /**
   * Get top topics
   */
  async getTopTopics(userId: string, limit: number = 10): Promise<PipelineTopTopic[]> {
    const results = await db
      .select({
        topic: pipelines.topic,
        count: count(),
        avgWordCount: sql<number>`AVG(${pipelines.targetWordCount})::float`,
      })
      .from(pipelines)
      .where(and(eq(pipelines.userId, userId), isNull(pipelines.deletedAt)))
      .groupBy(pipelines.topic)
      .orderBy(desc(count()))
      .limit(limit);

    return results.map((row) => ({
      topic: row.topic,
      count: Number(row.count),
      avgWordCount: row.avgWordCount || 0,
    }));
  },

  /**
   * Get top keywords
   */
  async getTopKeywords(userId: string, limit: number = 20): Promise<PipelineTopKeyword[]> {
    const results = await db
      .select({
        keywords: pipelines.keywords,
      })
      .from(pipelines)
      .where(
        and(
          eq(pipelines.userId, userId),
          isNull(pipelines.deletedAt),
          sql`${pipelines.keywords} is not null`
        )
      );

    // Count keywords
    const keywordCounts = new Map<string, number>();
    results.forEach((row) => {
      const keywords = row.keywords?.split(",").map((k) => k.trim()) || [];
      keywords.forEach((keyword) => {
        if (keyword) {
          keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
        }
      });
    });

    // Convert to array and sort
    return Array.from(keywordCounts.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(userId: string): Promise<PipelinePerformanceMetrics> {
    const result = await db
      .select({
        avgTimeToComplete: sql<number>`AVG(CASE WHEN ${pipelines.status} = 'completed' THEN EXTRACT(EPOCH FROM (${pipelines.updatedAt} - ${pipelines.createdAt})) END)::float`,
        totalCount: count(),
        successCount: sql<number>`count(*) filter (where ${pipelines.status} = 'completed')::int`,
        failureCount: sql<number>`count(*) filter (where ${pipelines.status} = 'failed')::int`,
        avgArticleChapters: sql<number>`AVG(${pipelines.articleTotalChapters})::float`,
        avgXhsImages: sql<number>`AVG(${pipelines.xhsTotalImages})::float`,
      })
      .from(pipelines)
      .where(and(eq(pipelines.userId, userId), isNull(pipelines.deletedAt)));

    const data = result[0];
    if (!data) {
      return {
        avgTimeToComplete: 0,
        successRate: 0,
        failureRate: 0,
        avgArticleChapters: 0,
        avgXhsImages: 0,
      };
    }

    const totalCount = Number(data.totalCount) || 0;
    const successCount = data.successCount || 0;
    const failureCount = data.failureCount || 0;

    return {
      avgTimeToComplete: data.avgTimeToComplete || 0,
      successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
      failureRate: totalCount > 0 ? (failureCount / totalCount) * 100 : 0,
      avgArticleChapters: data.avgArticleChapters || 0,
      avgXhsImages: data.avgXhsImages || 0,
    };
  },
};

export type PipelineAnalyticsService = typeof pipelineAnalyticsService;
