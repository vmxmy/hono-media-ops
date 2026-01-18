import { eq, and, gte, sql, desc, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { xhsImageJobs, xhsImages } from "@/server/db/schema";

// ==================== Types ====================

export interface XhsOverview {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  completionRate: number;
  totalImages: number;
  avgImagesPerJob: number;
}

export interface XhsStatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface XhsCreationTrend {
  date: string;
  count: number;
  cumulativeCount: number;
}

export interface XhsCompletionTrend {
  date: string;
  count: number;
  avgHours: number;
}

export interface XhsImageTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface XhsRatioDistribution {
  ratio: string;
  count: number;
}

export interface XhsResolutionDistribution {
  resolution: string;
  count: number;
}

export interface XhsCompletionAnalysis {
  totalJobs: number;
  fullyCompleted: number;
  partiallyCompleted: number;
  notStarted: number;
  avgCompletionRate: number;
}

export interface XhsTopSource {
  sourceUrl: string;
  sourceTitle: string | null;
  jobCount: number;
  totalImages: number;
  avgCompletionRate: number;
}

export interface XhsPerformanceMetrics {
  avgCompletionTimeHours: number;
  successRate: number;
  failureRate: number;
  avgImagesPerCompletedJob: number;
}

// ==================== Service ====================

export const xhsAnalyticsService = {
  /**
   * Get overview statistics for XHS image jobs
   */
  async getOverview(userId: string): Promise<XhsOverview> {
    const result = await db
      .select({
        totalJobs: sql<number>`count(*)::int`,
        pendingJobs: sql<number>`count(*) filter (where ${xhsImageJobs.status} = 'pending')::int`,
        processingJobs: sql<number>`count(*) filter (where ${xhsImageJobs.status} = 'processing')::int`,
        completedJobs: sql<number>`count(*) filter (where ${xhsImageJobs.status} = 'completed')::int`,
        failedJobs: sql<number>`count(*) filter (where ${xhsImageJobs.status} = 'failed')::int`,
        totalImages: sql<number>`sum(${xhsImageJobs.completedImages})::int`,
        plannedImages: sql<number>`sum(${xhsImageJobs.totalImages})::int`,
      })
      .from(xhsImageJobs)
      .where(and(eq(xhsImageJobs.userId, userId), isNull(xhsImageJobs.deletedAt)));

    const stats = result[0]!;
    const completionRate =
      stats.totalJobs > 0 ? (stats.completedJobs / stats.totalJobs) * 100 : 0;
    const avgImagesPerJob =
      stats.totalJobs > 0 ? stats.totalImages / stats.totalJobs : 0;

    return {
      totalJobs: stats.totalJobs,
      pendingJobs: stats.pendingJobs,
      processingJobs: stats.processingJobs,
      completedJobs: stats.completedJobs,
      failedJobs: stats.failedJobs,
      completionRate: Math.round(completionRate * 10) / 10,
      totalImages: stats.totalImages || 0,
      avgImagesPerJob: Math.round(avgImagesPerJob * 10) / 10,
    };
  },

  /**
   * Get status distribution
   */
  async getStatusDistribution(userId: string): Promise<XhsStatusDistribution[]> {
    const result = await db
      .select({
        status: xhsImageJobs.status,
        count: sql<number>`count(*)::int`,
      })
      .from(xhsImageJobs)
      .where(and(eq(xhsImageJobs.userId, userId), isNull(xhsImageJobs.deletedAt)))
      .groupBy(xhsImageJobs.status);

    const total = result.reduce((sum, item) => sum + item.count, 0);

    return result.map((item) => ({
      status: item.status,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0,
    }));
  },

  /**
   * Get creation trend over time
   */
  async getCreationTrend(userId: string, days: number = 30): Promise<XhsCreationTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db
      .select({
        date: sql<string>`date(${xhsImageJobs.createdAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(xhsImageJobs)
      .where(and(eq(xhsImageJobs.userId, userId), gte(xhsImageJobs.createdAt, startDate), isNull(xhsImageJobs.deletedAt)))
      .groupBy(sql`date(${xhsImageJobs.createdAt})`)
      .orderBy(sql`date(${xhsImageJobs.createdAt})`);

    let cumulative = 0;
    return result.map((item) => {
      cumulative += item.count;
      return {
        date: item.date,
        count: item.count,
        cumulativeCount: cumulative,
      };
    });
  },

  /**
   * Get completion trend with average completion time
   */
  async getCompletionTrend(userId: string, days: number = 30): Promise<XhsCompletionTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db
      .select({
        date: sql<string>`date(${xhsImageJobs.completedAt})`,
        count: sql<number>`count(*)::int`,
        avgHours: sql<number>`avg(extract(epoch from (${xhsImageJobs.completedAt} - ${xhsImageJobs.startedAt})) / 3600)::numeric`,
      })
      .from(xhsImageJobs)
      .where(
        and(
          eq(xhsImageJobs.userId, userId),
          eq(xhsImageJobs.status, "completed"),
          gte(xhsImageJobs.completedAt, startDate),
          isNull(xhsImageJobs.deletedAt)
        )
      )
      .groupBy(sql`date(${xhsImageJobs.completedAt})`)
      .orderBy(sql`date(${xhsImageJobs.completedAt})`);

    return result.map((item) => ({
      date: item.date,
      count: item.count,
      avgHours: Math.round(Number(item.avgHours) * 10) / 10,
    }));
  },

  /**
   * Get image type distribution
   */
  async getImageTypeDistribution(userId: string): Promise<XhsImageTypeDistribution[]> {
    const result = await db
      .select({
        type: xhsImages.type,
        count: sql<number>`count(*)::int`,
      })
      .from(xhsImages)
      .innerJoin(xhsImageJobs, eq(xhsImages.jobId, xhsImageJobs.id))
      .where(and(eq(xhsImageJobs.userId, userId), isNull(xhsImageJobs.deletedAt)))
      .groupBy(xhsImages.type);

    const total = result.reduce((sum, item) => sum + item.count, 0);

    return result.map((item) => ({
      type: item.type,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0,
    }));
  },

  /**
   * Get ratio distribution
   */
  async getRatioDistribution(userId: string): Promise<XhsRatioDistribution[]> {
    const result = await db
      .select({
        ratio: xhsImageJobs.ratio,
        count: sql<number>`count(*)::int`,
      })
      .from(xhsImageJobs)
      .where(and(eq(xhsImageJobs.userId, userId), isNull(xhsImageJobs.deletedAt)))
      .groupBy(xhsImageJobs.ratio)
      .orderBy(desc(sql`count(*)`));

    return result.map((item) => ({
      ratio: item.ratio || "unknown",
      count: item.count,
    }));
  },

  /**
   * Get resolution distribution
   */
  async getResolutionDistribution(userId: string): Promise<XhsResolutionDistribution[]> {
    const result = await db
      .select({
        resolution: xhsImageJobs.resolution,
        count: sql<number>`count(*)::int`,
      })
      .from(xhsImageJobs)
      .where(and(eq(xhsImageJobs.userId, userId), isNull(xhsImageJobs.deletedAt)))
      .groupBy(xhsImageJobs.resolution)
      .orderBy(desc(sql`count(*)`));

    return result.map((item) => ({
      resolution: item.resolution || "unknown",
      count: item.count,
    }));
  },

  /**
   * Get completion analysis
   */
  async getCompletionAnalysis(userId: string): Promise<XhsCompletionAnalysis> {
    const result = await db
      .select({
        totalJobs: sql<number>`count(*)::int`,
        fullyCompleted: sql<number>`count(*) filter (where ${xhsImageJobs.completedImages} = ${xhsImageJobs.totalImages})::int`,
        partiallyCompleted: sql<number>`count(*) filter (where ${xhsImageJobs.completedImages} > 0 and ${xhsImageJobs.completedImages} < ${xhsImageJobs.totalImages})::int`,
        notStarted: sql<number>`count(*) filter (where ${xhsImageJobs.completedImages} = 0)::int`,
        totalCompleted: sql<number>`sum(${xhsImageJobs.completedImages})::int`,
        totalPlanned: sql<number>`sum(${xhsImageJobs.totalImages})::int`,
      })
      .from(xhsImageJobs)
      .where(and(eq(xhsImageJobs.userId, userId), isNull(xhsImageJobs.deletedAt)));

    const stats = result[0]!;
    const avgCompletionRate =
      stats.totalPlanned > 0 ? (stats.totalCompleted / stats.totalPlanned) * 100 : 0;

    return {
      totalJobs: stats.totalJobs,
      fullyCompleted: stats.fullyCompleted,
      partiallyCompleted: stats.partiallyCompleted,
      notStarted: stats.notStarted,
      avgCompletionRate: Math.round(avgCompletionRate * 10) / 10,
    };
  },

  /**
   * Get top sources
   */
  async getTopSources(userId: string, limit: number = 10): Promise<XhsTopSource[]> {
    const result = await db
      .select({
        sourceUrl: xhsImageJobs.sourceUrl,
        sourceTitle: xhsImageJobs.sourceTitle,
        jobCount: sql<number>`count(*)::int`,
        totalImages: sql<number>`sum(${xhsImageJobs.completedImages})::int`,
        completedJobs: sql<number>`count(*) filter (where ${xhsImageJobs.status} = 'completed')::int`,
      })
      .from(xhsImageJobs)
      .where(and(eq(xhsImageJobs.userId, userId), isNull(xhsImageJobs.deletedAt)))
      .groupBy(xhsImageJobs.sourceUrl, xhsImageJobs.sourceTitle)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return result.map((item) => ({
      sourceUrl: item.sourceUrl,
      sourceTitle: item.sourceTitle,
      jobCount: item.jobCount,
      totalImages: item.totalImages || 0,
      avgCompletionRate: item.jobCount > 0 ? Math.round((item.completedJobs / item.jobCount) * 1000) / 10 : 0,
    }));
  },

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(userId: string): Promise<XhsPerformanceMetrics> {
    const result = await db
      .select({
        totalJobs: sql<number>`count(*)::int`,
        completedJobs: sql<number>`count(*) filter (where ${xhsImageJobs.status} = 'completed')::int`,
        failedJobs: sql<number>`count(*) filter (where ${xhsImageJobs.status} = 'failed')::int`,
        avgCompletionTimeHours: sql<number>`avg(extract(epoch from (${xhsImageJobs.completedAt} - ${xhsImageJobs.startedAt})) / 3600) filter (where ${xhsImageJobs.status} = 'completed')::numeric`,
        totalCompletedImages: sql<number>`sum(${xhsImageJobs.completedImages}) filter (where ${xhsImageJobs.status} = 'completed')::int`,
        completedJobsCount: sql<number>`count(*) filter (where ${xhsImageJobs.status} = 'completed')::int`,
      })
      .from(xhsImageJobs)
      .where(and(eq(xhsImageJobs.userId, userId), isNull(xhsImageJobs.deletedAt)));

    const stats = result[0]!;
    const successRate = stats.totalJobs > 0 ? (stats.completedJobs / stats.totalJobs) * 100 : 0;
    const failureRate = stats.totalJobs > 0 ? (stats.failedJobs / stats.totalJobs) * 100 : 0;
    const avgImagesPerCompletedJob = stats.completedJobsCount > 0 ? stats.totalCompletedImages / stats.completedJobsCount : 0;

    return {
      avgCompletionTimeHours: Math.round(Number(stats.avgCompletionTimeHours || 0) * 10) / 10,
      successRate: Math.round(successRate * 10) / 10,
      failureRate: Math.round(failureRate * 10) / 10,
      avgImagesPerCompletedJob: Math.round(avgImagesPerCompletedJob * 10) / 10,
    };
  },
};

export type XhsAnalyticsService = typeof xhsAnalyticsService;
