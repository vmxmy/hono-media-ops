import { eq, desc, and, isNull, isNotNull, sql, count, avg, sum } from "drizzle-orm";
import { db } from "@/server/db";
import { imagePrompts } from "@/server/db/schema";

// ==================== Types ====================

export interface PromptOverview {
  totalCount: number;
  publicCount: number;
  privateCount: number;
  avgRating: number;
  totalUsage: number;
  avgUseCount: number;
}

export interface PromptUsageTrend {
  date: string;
  count: number;
  cumulativeCount: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface CategoryUsage {
  category: string;
  totalUsage: number;
  avgUsage: number;
  promptCount: number;
}

export interface ModelDistribution {
  model: string;
  count: number;
  percentage: number;
}

export interface RatioDistribution {
  ratio: string;
  count: number;
  percentage: number;
}

export interface ResolutionDistribution {
  resolution: string;
  count: number;
  percentage: number;
}

export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface TopRatedPrompt {
  id: string;
  title: string;
  rating: number;
  useCount: number;
  category: string | null;
  createdAt: Date;
}

export interface SourceDistribution {
  source: string;
  count: number;
  percentage: number;
}

export interface PromptCreationTrend {
  date: string;
  count: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

// ==================== Service ====================

export const imagePromptAnalyticsService = {
  /**
   * Get overview statistics
   */
  async getOverview(userId: string): Promise<PromptOverview> {
    const result = await db
      .select({
        totalCount: count(),
        publicCount: sum(sql`CASE WHEN ${imagePrompts.isPublic} = 1 THEN 1 ELSE 0 END`),
        privateCount: sum(sql`CASE WHEN ${imagePrompts.isPublic} = 0 THEN 1 ELSE 0 END`),
        avgRating: avg(imagePrompts.rating),
        totalUsage: sum(imagePrompts.useCount),
        avgUseCount: avg(imagePrompts.useCount),
      })
      .from(imagePrompts)
      .where(
        and(
          eq(imagePrompts.userId, userId),
          isNull(imagePrompts.deletedAt)
        )
      );

    const data = result[0];
    return {
      totalCount: Number(data?.totalCount) || 0,
      publicCount: Number(data?.publicCount) || 0,
      privateCount: Number(data?.privateCount) || 0,
      avgRating: Number(data?.avgRating) || 0,
      totalUsage: Number(data?.totalUsage) || 0,
      avgUseCount: Number(data?.avgUseCount) || 0,
    };
  },

  /**
   * Get usage trend over time
   */
  async getUsageTrend(userId: string, days: number = 30): Promise<PromptUsageTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`date(${imagePrompts.lastUsedAt})`,
        count: count(),
      })
      .from(imagePrompts)
      .where(
        and(
          eq(imagePrompts.userId, userId),
          isNull(imagePrompts.deletedAt),
          isNotNull(imagePrompts.lastUsedAt),
          sql`${imagePrompts.lastUsedAt} >= ${startDate}`
        )
      )
      .groupBy(sql`date(${imagePrompts.lastUsedAt})`)
      .orderBy(sql`date(${imagePrompts.lastUsedAt})`);

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
   * Get category distribution
   */
  async getCategoryDistribution(userId: string): Promise<CategoryDistribution[]> {
    const results = await db
      .select({
        category: imagePrompts.category,
        count: count(),
      })
      .from(imagePrompts)
      .where(
        and(
          eq(imagePrompts.userId, userId),
          isNull(imagePrompts.deletedAt)
        )
      )
      .groupBy(imagePrompts.category)
      .orderBy(desc(count()));

    const total = results.reduce((sum, row) => sum + Number(row.count), 0);

    return results.map((row) => ({
      category: row.category || "uncategorized",
      count: Number(row.count),
      percentage: total > 0 ? (Number(row.count) / total) * 100 : 0,
    }));
  },

  /**
   * Get category usage statistics
   */
  async getCategoryUsage(userId: string): Promise<CategoryUsage[]> {
    const results = await db
      .select({
        category: imagePrompts.category,
        totalUsage: sum(imagePrompts.useCount),
        avgUsage: avg(imagePrompts.useCount),
        promptCount: count(),
      })
      .from(imagePrompts)
      .where(
        and(
          eq(imagePrompts.userId, userId),
          isNull(imagePrompts.deletedAt)
        )
      )
      .groupBy(imagePrompts.category)
      .orderBy(desc(sum(imagePrompts.useCount)));

    return results.map((row) => ({
      category: row.category || "uncategorized",
      totalUsage: Number(row.totalUsage) || 0,
      avgUsage: Number(row.avgUsage) || 0,
      promptCount: Number(row.promptCount),
    }));
  },

  /**
   * Get model distribution
   */
  async getModelDistribution(userId: string): Promise<ModelDistribution[]> {
    const results = await db
      .select({
        model: imagePrompts.model,
        count: count(),
      })
      .from(imagePrompts)
      .where(
        and(
          eq(imagePrompts.userId, userId),
          isNull(imagePrompts.deletedAt)
        )
      )
      .groupBy(imagePrompts.model)
      .orderBy(desc(count()));

    const total = results.reduce((sum, row) => sum + Number(row.count), 0);

    return results.map((row) => ({
      model: row.model || "unknown",
      count: Number(row.count),
      percentage: total > 0 ? (Number(row.count) / total) * 100 : 0,
    }));
  },

  /**
   * Get ratio distribution
   */
  async getRatioDistribution(userId: string): Promise<RatioDistribution[]> {
    const results = await db
      .select({
        ratio: imagePrompts.ratio,
        count: count(),
      })
      .from(imagePrompts)
      .where(
        and(
          eq(imagePrompts.userId, userId),
          isNull(imagePrompts.deletedAt)
        )
      )
      .groupBy(imagePrompts.ratio)
      .orderBy(desc(count()));

    const total = results.reduce((sum, row) => sum + Number(row.count), 0);

    return results.map((row) => ({
      ratio: row.ratio || "unknown",
      count: Number(row.count),
      percentage: total > 0 ? (Number(row.count) / total) * 100 : 0,
    }));
  },

  /**
   * Get resolution distribution
   */
  async getResolutionDistribution(userId: string): Promise<ResolutionDistribution[]> {
    const results = await db
      .select({
        resolution: imagePrompts.resolution,
        count: count(),
      })
      .from(imagePrompts)
      .where(
        and(
          eq(imagePrompts.userId, userId),
          isNull(imagePrompts.deletedAt)
        )
      )
      .groupBy(imagePrompts.resolution)
      .orderBy(desc(count()));

    const total = results.reduce((sum, row) => sum + Number(row.count), 0);

    return results.map((row) => ({
      resolution: row.resolution || "unknown",
      count: Number(row.count),
      percentage: total > 0 ? (Number(row.count) / total) * 100 : 0,
    }));
  },

  /**
   * Get rating distribution
   */
  async getRatingDistribution(userId: string): Promise<RatingDistribution[]> {
    const results = await db
      .select({
        rating: imagePrompts.rating,
        count: count(),
      })
      .from(imagePrompts)
      .where(
        and(
          eq(imagePrompts.userId, userId),
          isNull(imagePrompts.deletedAt)
        )
      )
      .groupBy(imagePrompts.rating)
      .orderBy(imagePrompts.rating);

    const total = results.reduce((sum, row) => sum + Number(row.count), 0);

    return results.map((row) => ({
      rating: Number(row.rating) || 0,
      count: Number(row.count),
      percentage: total > 0 ? (Number(row.count) / total) * 100 : 0,
    }));
  },

  /**
   * Get top rated prompts
   */
  async getTopRatedPrompts(userId: string, limit: number = 10): Promise<TopRatedPrompt[]> {
    const results = await db
      .select({
        id: imagePrompts.id,
        title: imagePrompts.title,
        rating: imagePrompts.rating,
        useCount: imagePrompts.useCount,
        category: imagePrompts.category,
        createdAt: imagePrompts.createdAt,
      })
      .from(imagePrompts)
      .where(
        and(
          eq(imagePrompts.userId, userId),
          isNull(imagePrompts.deletedAt)
        )
      )
      .orderBy(desc(imagePrompts.rating), desc(imagePrompts.useCount))
      .limit(limit);

    return results.map((row) => ({
      id: row.id,
      title: row.title,
      rating: Number(row.rating) || 0,
      useCount: Number(row.useCount),
      category: row.category,
      createdAt: row.createdAt,
    }));
  },

  /**
   * Get source distribution
   */
  async getSourceDistribution(userId: string): Promise<SourceDistribution[]> {
    const results = await db
      .select({
        source: imagePrompts.source,
        count: count(),
      })
      .from(imagePrompts)
      .where(
        and(
          eq(imagePrompts.userId, userId),
          isNull(imagePrompts.deletedAt)
        )
      )
      .groupBy(imagePrompts.source)
      .orderBy(desc(count()));

    const total = results.reduce((sum, row) => sum + Number(row.count), 0);

    return results.map((row) => ({
      source: row.source || "unknown",
      count: Number(row.count),
      percentage: total > 0 ? (Number(row.count) / total) * 100 : 0,
    }));
  },

  /**
   * Get creation trend over time
   */
  async getCreationTrend(userId: string, days: number = 30): Promise<PromptCreationTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`date(${imagePrompts.createdAt})`,
        count: count(),
      })
      .from(imagePrompts)
      .where(
        and(
          eq(imagePrompts.userId, userId),
          isNull(imagePrompts.deletedAt),
          sql`${imagePrompts.createdAt} >= ${startDate}`
        )
      )
      .groupBy(sql`date(${imagePrompts.createdAt})`)
      .orderBy(sql`date(${imagePrompts.createdAt})`);

    return results.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));
  },

  /**
   * Get top tags
   */
  async getTopTags(userId: string, limit: number = 20): Promise<TagCount[]> {
    const results = await db
      .select({
        tags: imagePrompts.tags,
      })
      .from(imagePrompts)
      .where(
        and(
          eq(imagePrompts.userId, userId),
          isNull(imagePrompts.deletedAt)
        )
      );

    // Count tags
    const tagCounts = new Map<string, number>();
    results.forEach((row) => {
      const tags = row.tags as string[] | null;
      if (tags && Array.isArray(tags)) {
        tags.forEach((tag) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });

    // Convert to array and sort
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
};

export type ImagePromptAnalyticsService = typeof imagePromptAnalyticsService;
