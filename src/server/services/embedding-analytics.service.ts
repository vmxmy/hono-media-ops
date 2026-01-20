import { eq, and, gte, sql, desc, isNull, count } from "drizzle-orm";
import { db } from "@/server/db";
import { articleEmbeddings, tasks } from "@/server/db/schema";

// ==================== Types ====================

export interface EmbeddingOverview {
  totalEmbeddings: number;
  totalTasks: number;
  embeddingRate: number;
  avgEmbeddingsPerDay: number;
  modelVersions: number;
}

export interface ModelVersionDistribution {
  modelVersion: string;
  count: number;
  percentage: number;
}

export interface EmbeddingCreationTrend {
  date: string;
  count: number;
  cumulativeCount: number;
}

export interface TaskEmbeddingStatus {
  totalTasks: number;
  tasksWithEmbeddings: number;
  tasksWithoutEmbeddings: number;
  embeddingRate: number;
}

export interface ContentHashAnalysis {
  uniqueHashes: number;
  duplicateHashes: number;
  duplicateRate: number;
  topDuplicates: Array<{
    contentHash: string;
    count: number;
  }>;
}

export interface EmbeddingAge {
  avgAgeInDays: number;
  oldestEmbedding: Date | null;
  newestEmbedding: Date | null;
  embeddingsOlderThan30Days: number;
  embeddingsOlderThan90Days: number;
}

export interface RecentEmbedding {
  id: string;
  taskId: string;
  executionId: string;
  modelVersion: string;
  contentHash: string;
  createdAt: Date;
}

export interface EmbeddingGrowthRate {
  last7Days: number;
  last30Days: number;
  last90Days: number;
  growthRate7to30: number;
  growthRate30to90: number;
}

// ==================== Service ====================

export const embeddingAnalyticsService = {
  /**
   * Get overview statistics
   */
  async getOverview(userId: string): Promise<EmbeddingOverview> {
    const result = await db
      .select({
        totalEmbeddings: count(),
        totalTasks: sql<number>`count(distinct ${articleEmbeddings.taskId})::int`,
        modelVersions: sql<number>`count(distinct ${articleEmbeddings.modelVersion})::int`,
        oldestDate: sql<Date>`min(${articleEmbeddings.createdAt})`,
      })
      .from(articleEmbeddings)
      .innerJoin(tasks, eq(articleEmbeddings.taskId, tasks.id))
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));

    const data = result[0];
    if (!data) {
      return {
        totalEmbeddings: 0,
        totalTasks: 0,
        embeddingRate: 0,
        avgEmbeddingsPerDay: 0,
        modelVersions: 0,
      };
    }

    const totalEmbeddings = Number(data.totalEmbeddings) || 0;
    const totalTasks = data.totalTasks || 0;

    // Calculate days since oldest embedding
    const daysSinceOldest = data.oldestDate
      ? Math.max(1, Math.floor((Date.now() - data.oldestDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 1;

    return {
      totalEmbeddings,
      totalTasks,
      embeddingRate: totalTasks > 0 ? (totalEmbeddings / totalTasks) * 100 : 0,
      avgEmbeddingsPerDay: totalEmbeddings / daysSinceOldest,
      modelVersions: data.modelVersions || 0,
    };
  },

  /**
   * Get model version distribution
   */
  async getModelVersionDistribution(userId: string): Promise<ModelVersionDistribution[]> {
    const results = await db
      .select({
        modelVersion: articleEmbeddings.modelVersion,
        count: count(),
      })
      .from(articleEmbeddings)
      .innerJoin(tasks, eq(articleEmbeddings.taskId, tasks.id))
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
      .groupBy(articleEmbeddings.modelVersion)
      .orderBy(desc(count()));

    const total = results.reduce((sum, row) => sum + Number(row.count), 0);

    return results.map((row) => ({
      modelVersion: row.modelVersion,
      count: Number(row.count),
      percentage: total > 0 ? (Number(row.count) / total) * 100 : 0,
    }));
  },

  /**
   * Get creation trend
   */
  async getCreationTrend(userId: string, days: number = 30): Promise<EmbeddingCreationTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`date(${articleEmbeddings.createdAt})`,
        count: count(),
      })
      .from(articleEmbeddings)
      .innerJoin(tasks, eq(articleEmbeddings.taskId, tasks.id))
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
          gte(articleEmbeddings.createdAt, startDate)
        )
      )
      .groupBy(sql`date(${articleEmbeddings.createdAt})`)
      .orderBy(sql`date(${articleEmbeddings.createdAt})`);

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
   * Get task embedding status
   */
  async getTaskEmbeddingStatus(userId: string): Promise<TaskEmbeddingStatus> {
    const result = await db
      .select({
        totalTasks: count(),
        tasksWithEmbeddings: sql<number>`count(distinct ${articleEmbeddings.taskId})::int`,
      })
      .from(tasks)
      .leftJoin(articleEmbeddings, eq(tasks.id, articleEmbeddings.taskId))
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));

    const data = result[0];
    if (!data) {
      return {
        totalTasks: 0,
        tasksWithEmbeddings: 0,
        tasksWithoutEmbeddings: 0,
        embeddingRate: 0,
      };
    }

    const totalTasks = Number(data.totalTasks) || 0;
    const tasksWithEmbeddings = data.tasksWithEmbeddings || 0;

    return {
      totalTasks,
      tasksWithEmbeddings,
      tasksWithoutEmbeddings: totalTasks - tasksWithEmbeddings,
      embeddingRate: totalTasks > 0 ? (tasksWithEmbeddings / totalTasks) * 100 : 0,
    };
  },

  /**
   * Get content hash analysis
   */
  async getContentHashAnalysis(userId: string): Promise<ContentHashAnalysis> {
    const result = await db
      .select({
        uniqueHashes: sql<number>`count(distinct ${articleEmbeddings.contentHash})::int`,
        totalEmbeddings: count(),
      })
      .from(articleEmbeddings)
      .innerJoin(tasks, eq(articleEmbeddings.taskId, tasks.id))
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));

    const duplicates = await db
      .select({
        contentHash: articleEmbeddings.contentHash,
        count: count(),
      })
      .from(articleEmbeddings)
      .innerJoin(tasks, eq(articleEmbeddings.taskId, tasks.id))
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
      .groupBy(articleEmbeddings.contentHash)
      .having(sql`count(*) > 1`)
      .orderBy(desc(count()))
      .limit(10);

    const data = result[0];
    const uniqueHashes = data?.uniqueHashes || 0;
    const totalEmbeddings = Number(data?.totalEmbeddings) || 0;
    const duplicateHashes = totalEmbeddings - uniqueHashes;

    return {
      uniqueHashes,
      duplicateHashes,
      duplicateRate: totalEmbeddings > 0 ? (duplicateHashes / totalEmbeddings) * 100 : 0,
      topDuplicates: duplicates.map((row) => ({
        contentHash: row.contentHash,
        count: Number(row.count),
      })),
    };
  },

  /**
   * Get embedding age analysis
   */
  async getEmbeddingAge(userId: string): Promise<EmbeddingAge> {
    const result = await db
      .select({
        avgAgeInDays: sql<number>`AVG(EXTRACT(EPOCH FROM (NOW() - ${articleEmbeddings.createdAt})) / 86400)::float`,
        oldestEmbedding: sql<Date>`MIN(${articleEmbeddings.createdAt})`,
        newestEmbedding: sql<Date>`MAX(${articleEmbeddings.createdAt})`,
        embeddingsOlderThan30Days: sql<number>`count(*) filter (where ${articleEmbeddings.createdAt} < (NOW() - interval '30 days'))::int`,
        embeddingsOlderThan90Days: sql<number>`count(*) filter (where ${articleEmbeddings.createdAt} < (NOW() - interval '90 days'))::int`,
      })
      .from(articleEmbeddings)
      .innerJoin(tasks, eq(articleEmbeddings.taskId, tasks.id))
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));

    const data = result[0];
    if (!data) {
      return {
        avgAgeInDays: 0,
        oldestEmbedding: null,
        newestEmbedding: null,
        embeddingsOlderThan30Days: 0,
        embeddingsOlderThan90Days: 0,
      };
    }

    return {
      avgAgeInDays: data.avgAgeInDays || 0,
      oldestEmbedding: data.oldestEmbedding,
      newestEmbedding: data.newestEmbedding,
      embeddingsOlderThan30Days: data.embeddingsOlderThan30Days || 0,
      embeddingsOlderThan90Days: data.embeddingsOlderThan90Days || 0,
    };
  },

  /**
   * Get recent embeddings
   */
  async getRecentEmbeddings(userId: string, limit: number = 20): Promise<RecentEmbedding[]> {
    const results = await db
      .select({
        id: articleEmbeddings.id,
        taskId: articleEmbeddings.taskId,
        executionId: articleEmbeddings.executionId,
        modelVersion: articleEmbeddings.modelVersion,
        contentHash: articleEmbeddings.contentHash,
        createdAt: articleEmbeddings.createdAt,
      })
      .from(articleEmbeddings)
      .innerJoin(tasks, eq(articleEmbeddings.taskId, tasks.id))
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
      .orderBy(desc(articleEmbeddings.createdAt))
      .limit(limit);

    return results.map((row) => ({
      id: row.id,
      taskId: row.taskId,
      executionId: row.executionId,
      modelVersion: row.modelVersion,
      contentHash: row.contentHash,
      createdAt: row.createdAt,
    }));
  },

  /**
   * Get growth rate analysis
   */
  async getGrowthRate(userId: string): Promise<EmbeddingGrowthRate> {
    const result = await db
      .select({
        last7Days: sql<number>`count(*) filter (where ${articleEmbeddings.createdAt} >= (NOW() - interval '7 days'))::int`,
        last30Days: sql<number>`count(*) filter (where ${articleEmbeddings.createdAt} >= (NOW() - interval '30 days'))::int`,
        last90Days: sql<number>`count(*) filter (where ${articleEmbeddings.createdAt} >= (NOW() - interval '90 days'))::int`,
      })
      .from(articleEmbeddings)
      .innerJoin(tasks, eq(articleEmbeddings.taskId, tasks.id))
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));

    const data = result[0];
    if (!data) {
      return {
        last7Days: 0,
        last30Days: 0,
        last90Days: 0,
        growthRate7to30: 0,
        growthRate30to90: 0,
      };
    }

    const last7Days = data.last7Days || 0;
    const last30Days = data.last30Days || 0;
    const last90Days = data.last90Days || 0;

    // Calculate growth rates
    const prev23Days = last30Days - last7Days;
    const prev60Days = last90Days - last30Days;

    return {
      last7Days,
      last30Days,
      last90Days,
      growthRate7to30: prev23Days > 0 ? ((last7Days - prev23Days) / prev23Days) * 100 : 0,
      growthRate30to90: prev60Days > 0 ? ((last30Days - prev60Days) / prev60Days) * 100 : 0,
    };
  },
};

export type EmbeddingAnalyticsService = typeof embeddingAnalyticsService;
