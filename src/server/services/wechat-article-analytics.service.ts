import { eq, and, gte, sql, desc, isNull, count, countDistinct } from "drizzle-orm";
import { db } from "@/server/db";
import { wechatArticles } from "@/server/db/schema";

// ==================== Types ====================

export interface WechatArticleOverview {
  totalArticles: number;
  totalAccounts: number;
  totalAuthors: number;
  adArticles: number;
  adRate: number;
  articlesWithCover: number;
  coverRate: number;
  avgArticlesPerAccount: number;
}

export interface AccountDistribution {
  accountName: string;
  fakeid: string;
  articleCount: number;
  percentage: number;
}

export interface AuthorDistribution {
  authorName: string;
  articleCount: number;
  percentage: number;
}

export interface ImportTrend {
  date: string;
  count: number;
  cumulativeCount: number;
}

export interface PublishTrend {
  date: string;
  count: number;
}

export interface AdAnalysis {
  totalAds: number;
  totalNonAds: number;
  adRate: number;
  topAdAccounts: Array<{
    accountName: string;
    adCount: number;
    totalCount: number;
    adRate: number;
  }>;
}

export interface CoverAnalysis {
  withCover: number;
  withoutCover: number;
  coverRate: number;
  topCoverAccounts: Array<{
    accountName: string;
    coverCount: number;
    totalCount: number;
    coverRate: number;
  }>;
}

export interface TimeDistribution {
  hour: number;
  count: number;
  percentage: number;
}

export interface TopArticles {
  id: string;
  title: string;
  accountName: string;
  authorName: string | null;
  createTime: number | null;
  link: string;
  isAd: boolean;
}

export interface AccountStats {
  accountName: string;
  fakeid: string;
  articleCount: number;
  adCount: number;
  adRate: number;
  withCoverCount: number;
  coverRate: number;
  firstArticleTime: number | null;
  lastArticleTime: number | null;
}

// ==================== Service ====================

export const wechatArticleAnalyticsService = {
  /**
   * Get overview statistics
   */
  async getOverview(): Promise<WechatArticleOverview> {
    const result = await db
      .select({
        totalArticles: count(),
        totalAccounts: countDistinct(wechatArticles.accountName),
        totalAuthors: countDistinct(wechatArticles.authorName),
        adArticles: sql<number>`count(*) filter (where ${wechatArticles.isAd} = true)::int`,
        articlesWithCover: sql<number>`count(*) filter (where ${wechatArticles.cover} is not null)::int`,
      })
      .from(wechatArticles)
      .where(isNull(wechatArticles.deletedAt));

    const data = result[0];
    if (!data) {
      return {
        totalArticles: 0,
        totalAccounts: 0,
        totalAuthors: 0,
        adArticles: 0,
        adRate: 0,
        articlesWithCover: 0,
        coverRate: 0,
        avgArticlesPerAccount: 0,
      };
    }

    const totalArticles = Number(data.totalArticles) || 0;
    const totalAccounts = Number(data.totalAccounts) || 0;
    const adArticles = data.adArticles || 0;
    const articlesWithCover = data.articlesWithCover || 0;

    return {
      totalArticles,
      totalAccounts,
      totalAuthors: Number(data.totalAuthors) || 0,
      adArticles,
      adRate: totalArticles > 0 ? (adArticles / totalArticles) * 100 : 0,
      articlesWithCover,
      coverRate: totalArticles > 0 ? (articlesWithCover / totalArticles) * 100 : 0,
      avgArticlesPerAccount: totalAccounts > 0 ? totalArticles / totalAccounts : 0,
    };
  },

  /**
   * Get account distribution (top 20)
   */
  async getAccountDistribution(limit: number = 20): Promise<AccountDistribution[]> {
    const results = await db
      .select({
        accountName: wechatArticles.accountName,
        fakeid: wechatArticles.fakeid,
        articleCount: count(),
      })
      .from(wechatArticles)
      .where(isNull(wechatArticles.deletedAt))
      .groupBy(wechatArticles.accountName, wechatArticles.fakeid)
      .orderBy(desc(count()))
      .limit(limit);

    const total = results.reduce((sum, row) => sum + Number(row.articleCount), 0);

    return results.map((row) => ({
      accountName: row.accountName,
      fakeid: row.fakeid,
      articleCount: Number(row.articleCount),
      percentage: total > 0 ? (Number(row.articleCount) / total) * 100 : 0,
    }));
  },

  /**
   * Get author distribution (top 20)
   */
  async getAuthorDistribution(limit: number = 20): Promise<AuthorDistribution[]> {
    const results = await db
      .select({
        authorName: wechatArticles.authorName,
        articleCount: count(),
      })
      .from(wechatArticles)
      .where(
        and(
          isNull(wechatArticles.deletedAt),
          sql`${wechatArticles.authorName} is not null`
        )
      )
      .groupBy(wechatArticles.authorName)
      .orderBy(desc(count()))
      .limit(limit);

    const total = results.reduce((sum, row) => sum + Number(row.articleCount), 0);

    return results.map((row) => ({
      authorName: row.authorName || "Unknown",
      articleCount: Number(row.articleCount),
      percentage: total > 0 ? (Number(row.articleCount) / total) * 100 : 0,
    }));
  },

  /**
   * Get import trend (articles imported into system)
   */
  async getImportTrend(days: number = 30): Promise<ImportTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`date(${wechatArticles.createdAt})`,
        count: count(),
      })
      .from(wechatArticles)
      .where(
        and(
          isNull(wechatArticles.deletedAt),
          gte(wechatArticles.createdAt, startDate)
        )
      )
      .groupBy(sql`date(${wechatArticles.createdAt})`)
      .orderBy(sql`date(${wechatArticles.createdAt})`);

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
   * Get publish trend (original article publish time)
   */
  async getPublishTrend(days: number = 30): Promise<PublishTrend[]> {
    const startTimestamp = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

    const results = await db
      .select({
        date: sql<string>`to_char(to_timestamp(${wechatArticles.createTime}), 'YYYY-MM-DD')`,
        count: count(),
      })
      .from(wechatArticles)
      .where(
        and(
          isNull(wechatArticles.deletedAt),
          sql`${wechatArticles.createTime} is not null`,
          sql`${wechatArticles.createTime} >= ${startTimestamp}`
        )
      )
      .groupBy(sql`to_char(to_timestamp(${wechatArticles.createTime}), 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(to_timestamp(${wechatArticles.createTime}), 'YYYY-MM-DD')`);

    return results.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));
  },

  /**
   * Get ad analysis
   */
  async getAdAnalysis(): Promise<AdAnalysis> {
    const overview = await db
      .select({
        totalAds: sql<number>`count(*) filter (where ${wechatArticles.isAd} = true)::int`,
        totalNonAds: sql<number>`count(*) filter (where ${wechatArticles.isAd} = false)::int`,
      })
      .from(wechatArticles)
      .where(isNull(wechatArticles.deletedAt));

    const topAdAccounts = await db
      .select({
        accountName: wechatArticles.accountName,
        adCount: sql<number>`count(*) filter (where ${wechatArticles.isAd} = true)::int`,
        totalCount: count(),
      })
      .from(wechatArticles)
      .where(isNull(wechatArticles.deletedAt))
      .groupBy(wechatArticles.accountName)
      .orderBy(desc(sql<number>`count(*) filter (where ${wechatArticles.isAd} = true)`))
      .limit(10);

    const data = overview[0];
    const totalAds = data?.totalAds || 0;
    const totalNonAds = data?.totalNonAds || 0;
    const total = totalAds + totalNonAds;

    return {
      totalAds,
      totalNonAds,
      adRate: total > 0 ? (totalAds / total) * 100 : 0,
      topAdAccounts: topAdAccounts.map((row) => {
        const adCount = row.adCount || 0;
        const totalCount = Number(row.totalCount);
        return {
          accountName: row.accountName,
          adCount,
          totalCount,
          adRate: totalCount > 0 ? (adCount / totalCount) * 100 : 0,
        };
      }),
    };
  },

  /**
   * Get cover analysis
   */
  async getCoverAnalysis(): Promise<CoverAnalysis> {
    const overview = await db
      .select({
        withCover: sql<number>`count(*) filter (where ${wechatArticles.cover} is not null)::int`,
        withoutCover: sql<number>`count(*) filter (where ${wechatArticles.cover} is null)::int`,
      })
      .from(wechatArticles)
      .where(isNull(wechatArticles.deletedAt));

    const topCoverAccounts = await db
      .select({
        accountName: wechatArticles.accountName,
        coverCount: sql<number>`count(*) filter (where ${wechatArticles.cover} is not null)::int`,
        totalCount: count(),
      })
      .from(wechatArticles)
      .where(isNull(wechatArticles.deletedAt))
      .groupBy(wechatArticles.accountName)
      .orderBy(desc(sql<number>`count(*) filter (where ${wechatArticles.cover} is not null)`))
      .limit(10);

    const data = overview[0];
    const withCover = data?.withCover || 0;
    const withoutCover = data?.withoutCover || 0;
    const total = withCover + withoutCover;

    return {
      withCover,
      withoutCover,
      coverRate: total > 0 ? (withCover / total) * 100 : 0,
      topCoverAccounts: topCoverAccounts.map((row) => {
        const coverCount = row.coverCount || 0;
        const totalCount = Number(row.totalCount);
        return {
          accountName: row.accountName,
          coverCount,
          totalCount,
          coverRate: totalCount > 0 ? (coverCount / totalCount) * 100 : 0,
        };
      }),
    };
  },

  /**
   * Get time distribution (by hour of day)
   */
  async getTimeDistribution(): Promise<TimeDistribution[]> {
    const results = await db
      .select({
        hour: sql<number>`extract(hour from to_timestamp(${wechatArticles.createTime}))::int`,
        count: count(),
      })
      .from(wechatArticles)
      .where(
        and(
          isNull(wechatArticles.deletedAt),
          sql`${wechatArticles.createTime} is not null`
        )
      )
      .groupBy(sql`extract(hour from to_timestamp(${wechatArticles.createTime}))`)
      .orderBy(sql`extract(hour from to_timestamp(${wechatArticles.createTime}))`);

    const total = results.reduce((sum, row) => sum + Number(row.count), 0);

    return results.map((row) => ({
      hour: row.hour,
      count: Number(row.count),
      percentage: total > 0 ? (Number(row.count) / total) * 100 : 0,
    }));
  },

  /**
   * Get top articles (most recent)
   */
  async getTopArticles(limit: number = 20): Promise<TopArticles[]> {
    const results = await db
      .select({
        id: wechatArticles.id,
        title: wechatArticles.title,
        accountName: wechatArticles.accountName,
        authorName: wechatArticles.authorName,
        createTime: wechatArticles.createTime,
        link: wechatArticles.link,
        isAd: wechatArticles.isAd,
      })
      .from(wechatArticles)
      .where(isNull(wechatArticles.deletedAt))
      .orderBy(desc(wechatArticles.createTime))
      .limit(limit);

    return results.map((row) => ({
      id: row.id,
      title: row.title,
      accountName: row.accountName,
      authorName: row.authorName,
      createTime: row.createTime,
      link: row.link,
      isAd: row.isAd,
    }));
  },

  /**
   * Get account statistics
   */
  async getAccountStats(limit: number = 20): Promise<AccountStats[]> {
    const results = await db
      .select({
        accountName: wechatArticles.accountName,
        fakeid: wechatArticles.fakeid,
        articleCount: count(),
        adCount: sql<number>`count(*) filter (where ${wechatArticles.isAd} = true)::int`,
        withCoverCount: sql<number>`count(*) filter (where ${wechatArticles.cover} is not null)::int`,
        firstArticleTime: sql<number>`min(${wechatArticles.createTime})`,
        lastArticleTime: sql<number>`max(${wechatArticles.createTime})`,
      })
      .from(wechatArticles)
      .where(isNull(wechatArticles.deletedAt))
      .groupBy(wechatArticles.accountName, wechatArticles.fakeid)
      .orderBy(desc(count()))
      .limit(limit);

    return results.map((row) => {
      const articleCount = Number(row.articleCount);
      const adCount = row.adCount || 0;
      const withCoverCount = row.withCoverCount || 0;

      return {
        accountName: row.accountName,
        fakeid: row.fakeid,
        articleCount,
        adCount,
        adRate: articleCount > 0 ? (adCount / articleCount) * 100 : 0,
        withCoverCount,
        coverRate: articleCount > 0 ? (withCoverCount / articleCount) * 100 : 0,
        firstArticleTime: row.firstArticleTime,
        lastArticleTime: row.lastArticleTime,
      };
    });
  },
};

export type WechatArticleAnalyticsService = typeof wechatArticleAnalyticsService;
