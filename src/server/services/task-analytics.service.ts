import { eq, and, gte, sql, desc, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { tasks, taskExecutions } from "@/server/db/schema";

// ==================== Types ====================

export interface TaskOverview {
  totalCount: number;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  completionRate: number;
  avgWordCount: number;
  totalWordCount: number;
}

export interface TaskStatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface TaskCreationTrend {
  date: string;
  count: number;
  cumulativeCount: number;
}

export interface TaskCompletionTrend {
  date: string;
  count: number;
  avgDays: number;
}

export interface WordCountDistribution {
  range: string;
  count: number;
  minWords: number;
  maxWords: number;
}

export interface ProgressAnalysis {
  totalTasks: number;
  tasksWithProgress: number;
  avgProgress: number;
  completedChapters: number;
  totalChapters: number;
}

export interface ReferenceUsage {
  withMaterial: number;
  withCoverPrompt: number;
  withBoth: number;
  withNeither: number;
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgExecutionTime: number;
}

export interface TopTopic {
  topic: string;
  count: number;
  avgWordCount: number;
  completionRate: number;
}

export interface TopKeyword {
  keyword: string;
  count: number;
}

// ==================== Service ====================

export const taskAnalyticsService = {
  /**
   * Get overview statistics for tasks
   */
  async getOverview(userId: string): Promise<TaskOverview> {
    const result = await db
      .select({
        totalCount: sql<number>`count(*)::int`,
        pendingCount: sql<number>`count(*) filter (where ${tasks.status} = 'pending')::int`,
        processingCount: sql<number>`count(*) filter (where ${tasks.status} = 'processing')::int`,
        completedCount: sql<number>`count(*) filter (where ${tasks.status} = 'completed')::int`,
        failedCount: sql<number>`count(*) filter (where ${tasks.status} = 'failed')::int`,
        cancelledCount: sql<number>`count(*) filter (where ${tasks.status} = 'cancelled')::int`,
        avgWordCount: sql<number>`avg(${tasks.totalWordCount})::int`,
        totalWordCount: sql<number>`sum(${tasks.totalWordCount})::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));

    const stats = result[0]!;
    const completionRate =
      stats.totalCount > 0 ? (stats.completedCount / stats.totalCount) * 100 : 0;

    return {
      ...stats,
      completionRate: Math.round(completionRate * 10) / 10,
      avgWordCount: stats.avgWordCount || 0,
      totalWordCount: stats.totalWordCount || 0,
    };
  },

  /**
   * Get status distribution
   */
  async getStatusDistribution(userId: string): Promise<TaskStatusDistribution[]> {
    const result = await db
      .select({
        status: tasks.status,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
      .groupBy(tasks.status);

    const total = result.reduce((sum, item) => sum + item.count, 0);

    return result.map((item) => ({
      status: item.status,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0,
    }));
  },

  /**
   * Get task creation trend over time
   */
  async getCreationTrend(userId: string, days: number = 30): Promise<TaskCreationTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db
      .select({
        date: sql<string>`date(${tasks.createdAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), gte(tasks.createdAt, startDate), isNull(tasks.deletedAt)))
      .groupBy(sql`date(${tasks.createdAt})`)
      .orderBy(sql`date(${tasks.createdAt})`);

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
   * Get task completion trend with average completion time
   */
  async getCompletionTrend(userId: string, days: number = 30): Promise<TaskCompletionTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db
      .select({
        date: sql<string>`date(${tasks.updatedAt})`,
        count: sql<number>`count(*)::int`,
        avgDays: sql<number>`avg(extract(epoch from (${tasks.updatedAt} - ${tasks.createdAt})) / 86400)::numeric`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, "completed"),
          gte(tasks.updatedAt, startDate),
          isNull(tasks.deletedAt)
        )
      )
      .groupBy(sql`date(${tasks.updatedAt})`)
      .orderBy(sql`date(${tasks.updatedAt})`);

    return result.map((item) => ({
      date: item.date,
      count: item.count,
      avgDays: Math.round(Number(item.avgDays) * 10) / 10,
    }));
  },

  /**
   * Get word count distribution
   */
  async getWordCountDistribution(userId: string): Promise<WordCountDistribution[]> {
    const ranges = [
      { label: "0-1000", min: 0, max: 1000 },
      { label: "1001-2000", min: 1001, max: 2000 },
      { label: "2001-3000", min: 2001, max: 3000 },
      { label: "3001-5000", min: 3001, max: 5000 },
      { label: "5001+", min: 5001, max: 999999 },
    ];

    const results = await Promise.all(
      ranges.map(async (range) => {
        const result = await db
          .select({
            count: sql<number>`count(*)::int`,
          })
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, userId),
              gte(tasks.totalWordCount, range.min),
              sql`${tasks.totalWordCount} <= ${range.max}`,
              isNull(tasks.deletedAt)
            )
          );

        return {
          range: range.label,
          count: result[0]?.count || 0,
          minWords: range.min,
          maxWords: range.max,
        };
      })
    );

    return results;
  },

  /**
   * Get progress analysis
   */
  async getProgressAnalysis(userId: string): Promise<ProgressAnalysis> {
    const result = await db
      .select({
        totalTasks: sql<number>`count(*)::int`,
        tasksWithProgress: sql<number>`count(*) filter (where ${tasks.currentChapter} is not null)::int`,
        completedChapters: sql<number>`sum(${tasks.currentChapter})::int`,
        totalChapters: sql<number>`sum(${tasks.totalChapters})::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));

    const stats = result[0]!;
    const avgProgress =
      stats.totalChapters > 0 ? (stats.completedChapters / stats.totalChapters) * 100 : 0;

    return {
      totalTasks: stats.totalTasks,
      tasksWithProgress: stats.tasksWithProgress,
      avgProgress: Math.round(avgProgress * 10) / 10,
      completedChapters: stats.completedChapters || 0,
      totalChapters: stats.totalChapters || 0,
    };
  },

  /**
   * Get reference usage statistics
   */
  async getReferenceUsage(userId: string): Promise<ReferenceUsage> {
    const result = await db
      .select({
        withMaterial: sql<number>`count(*) filter (where ${tasks.refMaterialId} is not null and ${tasks.coverPromptId} is null)::int`,
        withCoverPrompt: sql<number>`count(*) filter (where ${tasks.coverPromptId} is not null and ${tasks.refMaterialId} is null)::int`,
        withBoth: sql<number>`count(*) filter (where ${tasks.refMaterialId} is not null and ${tasks.coverPromptId} is not null)::int`,
        withNeither: sql<number>`count(*) filter (where ${tasks.refMaterialId} is null and ${tasks.coverPromptId} is null)::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));

    return result[0]!;
  },

  /**
   * Get execution statistics
   */
  async getExecutionStats(userId: string): Promise<ExecutionStats> {
    const result = await db
      .select({
        totalExecutions: sql<number>`count(*)::int`,
        successfulExecutions: sql<number>`count(*) filter (where ${taskExecutions.status} = 'completed')::int`,
        failedExecutions: sql<number>`count(*) filter (where ${taskExecutions.status} = 'failed')::int`,
      })
      .from(taskExecutions)
      .innerJoin(tasks, eq(taskExecutions.taskId, tasks.id))
      .where(eq(tasks.userId, userId));

    const stats = result[0]!;
    const successRate =
      stats.totalExecutions > 0 ? (stats.successfulExecutions / stats.totalExecutions) * 100 : 0;

    return {
      totalExecutions: stats.totalExecutions,
      successfulExecutions: stats.successfulExecutions,
      failedExecutions: stats.failedExecutions,
      successRate: Math.round(successRate * 10) / 10,
      avgExecutionTime: 0, // TODO: Calculate from execution timestamps if available
    };
  },

  /**
   * Get top topics
   */
  async getTopTopics(userId: string, limit: number = 10): Promise<TopTopic[]> {
    const result = await db
      .select({
        topic: tasks.topic,
        count: sql<number>`count(*)::int`,
        avgWordCount: sql<number>`avg(${tasks.totalWordCount})::int`,
        completedCount: sql<number>`count(*) filter (where ${tasks.status} = 'completed')::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
      .groupBy(tasks.topic)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return result.map((item) => ({
      topic: item.topic,
      count: item.count,
      avgWordCount: item.avgWordCount || 0,
      completionRate: item.count > 0 ? Math.round((item.completedCount / item.count) * 1000) / 10 : 0,
    }));
  },

  /**
   * Get top keywords
   */
  async getTopKeywords(userId: string, limit: number = 20): Promise<TopKeyword[]> {
    const result = await db
      .select({
        keywords: tasks.keywords,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));

    // Parse keywords and count occurrences
    const keywordCounts = new Map<string, number>();
    result.forEach((row) => {
      if (row.keywords) {
        const keywords = row.keywords.split(",").map((k) => k.trim());
        keywords.forEach((keyword) => {
          if (keyword) {
            keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
          }
        });
      }
    });

    // Convert to array and sort
    const topKeywords = Array.from(keywordCounts.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return topKeywords;
  },
};

export type TaskAnalyticsService = typeof taskAnalyticsService;
