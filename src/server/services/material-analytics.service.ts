import { eq, desc, and, gte, sql, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { styleAnalyses, tasks } from "@/server/db/schema";

// ==================== Types ====================

// Overview Statistics Types
export interface MaterialOverview {
  totalCount: number;
  successCount: number;
  successRate: number;
  pendingCount: number;
  failedCount: number;
  avgWordCount: number;
  avgParaCount: number;
  avgUsageCount: number;
  totalUsageCount: number;
  usageRate: number;
}

export interface GrowthTrend {
  date: string; // YYYY-MM-DD
  count: number;
  cumulativeCount: number;
}

export interface UsageStats {
  totalUsage: number;
  usedMaterialCount: number;
  unusedMaterialCount: number;
  avgUsagePerMaterial: number;
  usageRate: number;
}

export interface QualityMetrics {
  avgWordCount: number;
  avgParaCount: number;
  avgBurstiness: number;
  avgTtr: number;
  avgSentLen: number;
  medianWordCount: number;
  medianParaCount: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface CreationTrend {
  date: string; // YYYY-MM-DD
  count: number;
}

// Quality Analysis Types
export interface WordCountDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface MetricsScatterPoint {
  id: string;
  sourceTitle: string;
  ttr: number;
  burstiness: number;
  wordCount: number;
}

export interface ParaCountDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface SentLenDistribution {
  range: string;
  count: number;
  percentage: number;
}

// Quality Scoring Types
export type QualityGrade = "S" | "A" | "B" | "C" | "D";

export interface QualityScore {
  totalScore: number;
  grade: QualityGrade;
  contentScore: number;
  structureScore: number;
  metricsScore: number;
  usageScore: number;
}

export interface QualityIssue {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  suggestion: string;
}

export interface MaterialQualityDetail {
  id: string;
  sourceTitle: string;
  qualityScore: QualityScore;
  issues: QualityIssue[];
  createdAt: Date;
  lastUsedAt: Date | null;
}

// Category Analysis Types
export interface TypeDistribution {
  type: string;
  count: number;
  percentage: number;
  avgWordCount: number;
  avgParaCount: number;
  avgBurstiness: number;
  avgTtr: number;
  avgSentLen: number;
  avgUsageCount: number;
  totalUsageCount: number;
  usageRate: number;
}

export interface TypeRadarComparison {
  type: string;
  dimensions: {
    wordCount: number;
    paraCount: number;
    burstiness: number;
    ttr: number;
    usageCount: number;
  };
}

export interface TypeTrend {
  date: string;
  type: string;
  count: number;
  cumulativeCount: number;
}

// Usage Analysis Types
export type LifecycleStage = "new" | "active" | "mature" | "declining" | "dormant" | "unused";

export interface TopUsedMaterial {
  id: string;
  sourceTitle: string;
  styleName: string;
  primaryType: string;
  useCount: number;
  lastUsedAt: Date | null;
  firstUsedAt: Date | null;
  wordCount: number;
  qualityScore: number;
  grade: QualityGrade;
  daysSinceCreation: number;
  daysSinceLastUse: number | null;
  usageFrequency: number;
}

export interface MaterialLifecycle {
  materialId: string;
  sourceTitle: string;
  stage: LifecycleStage;
  createdAt: Date;
  firstUsedAt: Date | null;
  lastUsedAt: Date | null;
  daysSinceCreation: number;
  daysSinceLastUse: number | null;
  totalUses: number;
  usageFrequency: number;
}

// ==================== Helper Functions ====================

// Lifecycle Stage Determination
function determineLifecycleStage(
  daysSinceCreation: number,
  daysSinceLastUse: number | null,
  totalUses: number,
  usageFrequency: number
): LifecycleStage {
  if (totalUses === 0) return "unused";
  if (daysSinceCreation <= 7) return "new";
  if (daysSinceLastUse !== null && daysSinceLastUse <= 30) return "active";
  if (daysSinceCreation > 30 && usageFrequency > 0.1) return "mature";
  if (daysSinceLastUse !== null && daysSinceLastUse > 30 && daysSinceLastUse <= 90) return "declining";
  if (daysSinceLastUse !== null && daysSinceLastUse > 90) return "dormant";
  return "unused";
}

// Content Quality Scoring (25 points)
function calculateWordCountScore(wordCount: number | null): number {
  if (!wordCount) return 0;
  if (wordCount >= 2000 && wordCount <= 5000) return 10;
  if ((wordCount >= 1000 && wordCount < 2000) || (wordCount > 5000 && wordCount <= 8000)) return 7;
  if ((wordCount >= 500 && wordCount < 1000) || (wordCount > 8000 && wordCount <= 10000)) return 4;
  return 2;
}

function calculateParaCountScore(paraCount: number | null): number {
  if (!paraCount) return 0;
  if (paraCount >= 10 && paraCount <= 30) return 10;
  if ((paraCount >= 5 && paraCount < 10) || (paraCount > 30 && paraCount <= 50)) return 7;
  if ((paraCount >= 3 && paraCount < 5) || (paraCount > 50 && paraCount <= 80)) return 4;
  return 2;
}

function calculateCompletenessScore(
  styleIdentity: unknown,
  lexicalLogic: unknown,
  rhetoricLogic: unknown
): number {
  let score = 0;
  if (styleIdentity && typeof styleIdentity === 'object' && Object.keys(styleIdentity).length > 0) score += 2;
  if (lexicalLogic && typeof lexicalLogic === 'object' && Object.keys(lexicalLogic).length > 0) score += 2;
  if (rhetoricLogic && typeof rhetoricLogic === 'object' && Object.keys(rhetoricLogic).length > 0) score += 1;
  return score;
}

// Structure Quality Scoring (25 points)
function calculateParaDensityScore(wordCount: number | null, paraCount: number | null): number {
  if (!wordCount || !paraCount || paraCount === 0) return 0;
  const density = wordCount / paraCount;
  if (density >= 80 && density <= 200) return 10;
  if ((density >= 50 && density < 80) || (density > 200 && density <= 300)) return 7;
  if ((density >= 30 && density < 50) || (density > 300 && density <= 400)) return 4;
  return 2;
}

function calculateSentLenScore(avgSentLen: number | null): number {
  if (!avgSentLen) return 0;
  if (avgSentLen >= 15 && avgSentLen <= 25) return 10;
  if ((avgSentLen >= 12 && avgSentLen < 15) || (avgSentLen > 25 && avgSentLen <= 30)) return 7;
  if ((avgSentLen >= 10 && avgSentLen < 12) || (avgSentLen > 30 && avgSentLen <= 35)) return 4;
  return 2;
}

function calculateStructureDataScore(
  coreRules: unknown,
  blueprint: unknown
): number {
  let score = 0;
  if (coreRules && typeof coreRules === 'object' && Object.keys(coreRules).length > 0) score += 3;
  if (blueprint && typeof blueprint === 'object' && Object.keys(blueprint).length > 0) score += 2;
  return score;
}

// Metrics Quality Scoring (25 points)
function calculateTtrScore(ttr: number | null): number {
  if (!ttr) return 0;
  if (ttr >= 0.6 && ttr <= 0.8) return 10;
  if ((ttr >= 0.5 && ttr < 0.6) || (ttr > 0.8 && ttr <= 0.9)) return 7;
  if ((ttr >= 0.4 && ttr < 0.5) || (ttr > 0.9 && ttr <= 0.95)) return 4;
  return 2;
}

function calculateBurstinessScore(burstiness: number | null): number {
  if (!burstiness) return 0;
  if (burstiness >= 8 && burstiness <= 15) return 10;
  if ((burstiness >= 5 && burstiness < 8) || (burstiness > 15 && burstiness <= 20)) return 7;
  if ((burstiness >= 3 && burstiness < 5) || (burstiness > 20 && burstiness <= 25)) return 4;
  return 2;
}

function calculateMetricsCompletenessScore(
  ttr: number | null,
  burstiness: number | null,
  avgSentLen: number | null
): number {
  let score = 0;
  if (ttr !== null && ttr > 0) score += 2;
  if (burstiness !== null && burstiness > 0) score += 2;
  if (avgSentLen !== null && avgSentLen > 0) score += 1;
  return score;
}

// Usage Value Scoring (25 points)
function calculateUsageFrequencyScore(useCount: number, daysSinceCreation: number): number {
  if (daysSinceCreation === 0) return 0;
  const frequency = useCount / daysSinceCreation;
  if (frequency >= 0.5) return 15;
  if (frequency >= 0.2) return 12;
  if (frequency >= 0.1) return 9;
  if (frequency >= 0.05) return 6;
  if (frequency > 0) return 3;
  return 0;
}

function calculateRecencyScore(daysSinceLastUse: number | null): number {
  if (daysSinceLastUse === null) return 0;
  if (daysSinceLastUse <= 7) return 10;
  if (daysSinceLastUse <= 30) return 7;
  if (daysSinceLastUse <= 90) return 4;
  return 1;
}

// Grade Calculation
function calculateGrade(totalScore: number): QualityGrade {
  if (totalScore >= 90) return "S";
  if (totalScore >= 75) return "A";
  if (totalScore >= 60) return "B";
  if (totalScore >= 45) return "C";
  return "D";
}

// Main Quality Score Calculation
function calculateQualityScore(material: {
  wordCount: number | null;
  paraCount: number | null;
  metricsTtr: number | null;
  metricsBurstiness: number | null;
  metricsAvgSentLen: number | null;
  useCount: number;
  createdAt: Date;
  styleIdentity: unknown;
  lexicalLogic: unknown;
  rhetoricLogic: unknown;
  coreRules: unknown;
  blueprint: unknown;
}): QualityScore {
  const daysSinceCreation = Math.floor(
    (Date.now() - material.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Content Quality (25 points)
  const contentScore =
    calculateWordCountScore(material.wordCount) +
    calculateParaCountScore(material.paraCount) +
    calculateCompletenessScore(
      material.styleIdentity,
      material.lexicalLogic,
      material.rhetoricLogic
    );

  // Structure Quality (25 points)
  const structureScore =
    calculateParaDensityScore(material.wordCount, material.paraCount) +
    calculateSentLenScore(material.metricsAvgSentLen) +
    calculateStructureDataScore(material.coreRules, material.blueprint);

  // Metrics Quality (25 points)
  const metricsScore =
    calculateTtrScore(material.metricsTtr) +
    calculateBurstinessScore(material.metricsBurstiness) +
    calculateMetricsCompletenessScore(
      material.metricsTtr,
      material.metricsBurstiness,
      material.metricsAvgSentLen
    );

  // Usage Value (25 points)
  const usageScore =
    calculateUsageFrequencyScore(material.useCount, daysSinceCreation) +
    calculateRecencyScore(null); // Will be calculated with actual last used date

  const totalScore = contentScore + structureScore + metricsScore + usageScore;
  const grade = calculateGrade(totalScore);

  return {
    totalScore,
    grade,
    contentScore,
    structureScore,
    metricsScore,
    usageScore,
  };
}

// ==================== Service ====================

export const materialAnalyticsService = {
  /**
   * Get overview statistics for materials
   */
  async getOverview(userId: string): Promise<MaterialOverview> {
    const result = await db
      .select({
        totalCount: sql<number>`COUNT(DISTINCT ${styleAnalyses.id})::int`,
        successCount: sql<number>`COUNT(DISTINCT ${styleAnalyses.id}) FILTER (WHERE ${styleAnalyses.status} = 'SUCCESS')::int`,
        pendingCount: sql<number>`COUNT(DISTINCT ${styleAnalyses.id}) FILTER (WHERE ${styleAnalyses.status} = 'PENDING')::int`,
        failedCount: sql<number>`COUNT(DISTINCT ${styleAnalyses.id}) FILTER (WHERE ${styleAnalyses.status} = 'FAILED')::int`,
        avgWordCount: sql<number>`AVG(${styleAnalyses.wordCount})::float`,
        avgParaCount: sql<number>`AVG(${styleAnalyses.paraCount})::float`,
        totalUsageCount: sql<number>`COUNT(${tasks.id})::int`,
        usedCount: sql<number>`COUNT(DISTINCT CASE WHEN ${tasks.id} IS NOT NULL THEN ${styleAnalyses.id} END)::int`,
      })
      .from(styleAnalyses)
      .leftJoin(
        tasks,
        and(
          eq(tasks.refMaterialId, styleAnalyses.id),
          isNull(tasks.deletedAt)
        )
      )
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt)
        )
      );

    const data = result[0];
    if (!data) {
      return {
        totalCount: 0,
        successCount: 0,
        successRate: 0,
        pendingCount: 0,
        failedCount: 0,
        avgWordCount: 0,
        avgParaCount: 0,
        avgUsageCount: 0,
        totalUsageCount: 0,
        usageRate: 0,
      };
    }

    const totalCount = data.totalCount ?? 0;
    const successCount = data.successCount ?? 0;
    const usedCount = data.usedCount ?? 0;
    const totalUsageCount = data.totalUsageCount ?? 0;

    return {
      totalCount,
      successCount,
      successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
      pendingCount: data.pendingCount ?? 0,
      failedCount: data.failedCount ?? 0,
      avgWordCount: data.avgWordCount ?? 0,
      avgParaCount: data.avgParaCount ?? 0,
      avgUsageCount: totalCount > 0 ? totalUsageCount / totalCount : 0,
      totalUsageCount,
      usageRate: totalCount > 0 ? (usedCount / totalCount) * 100 : 0,
    };
  },

  /**
   * Get growth trend over time
   */
  async getGrowthTrend(
    userId: string,
    days: number = 30
  ): Promise<GrowthTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db
      .select({
        date: sql<string>`date(${styleAnalyses.createdAt})::text`,
        count: sql<number>`COUNT(*)::int`,
        cumulativeCount: sql<number>`SUM(COUNT(*)) OVER (ORDER BY date(${styleAnalyses.createdAt}))::int`,
      })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt),
          gte(styleAnalyses.createdAt, startDate)
        )
      )
      .groupBy(sql`date(${styleAnalyses.createdAt})`)
      .orderBy(sql`date(${styleAnalyses.createdAt})`);

    return result.map((row) => ({
      date: row.date,
      count: row.count,
      cumulativeCount: row.cumulativeCount,
    }));
  },

  /**
   * Get usage statistics
   */
  async getUsageStats(userId: string): Promise<UsageStats> {
    const result = await db
      .select({
        totalUsage: sql<number>`COUNT(${tasks.id})::int`,
        usedCount: sql<number>`COUNT(DISTINCT CASE WHEN ${tasks.id} IS NOT NULL THEN ${styleAnalyses.id} END)::int`,
        totalCount: sql<number>`COUNT(DISTINCT ${styleAnalyses.id})::int`,
      })
      .from(styleAnalyses)
      .leftJoin(
        tasks,
        and(
          eq(tasks.refMaterialId, styleAnalyses.id),
          isNull(tasks.deletedAt)
        )
      )
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt)
        )
      );

    const data = result[0];
    if (!data) {
      return {
        totalUsage: 0,
        usedMaterialCount: 0,
        unusedMaterialCount: 0,
        avgUsagePerMaterial: 0,
        usageRate: 0,
      };
    }

    const totalUsage = data.totalUsage ?? 0;
    const usedCount = data.usedCount ?? 0;
    const totalCount = data.totalCount ?? 0;

    return {
      totalUsage,
      usedMaterialCount: usedCount,
      unusedMaterialCount: totalCount - usedCount,
      avgUsagePerMaterial: totalCount > 0 ? totalUsage / totalCount : 0,
      usageRate: totalCount > 0 ? (usedCount / totalCount) * 100 : 0,
    };
  },

  /**
   * Get quality metrics
   */
  async getQualityMetrics(userId: string): Promise<QualityMetrics> {
    const result = await db
      .select({
        avgWordCount: sql<number>`AVG(${styleAnalyses.wordCount})::float`,
        avgParaCount: sql<number>`AVG(${styleAnalyses.paraCount})::float`,
        avgBurstiness: sql<number>`AVG(${styleAnalyses.metricsBurstiness})::float`,
        avgTtr: sql<number>`AVG(${styleAnalyses.metricsTtr})::float`,
        avgSentLen: sql<number>`AVG(${styleAnalyses.metricsAvgSentLen})::float`,
        medianWordCount: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${styleAnalyses.wordCount})::float`,
        medianParaCount: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${styleAnalyses.paraCount})::float`,
      })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt)
        )
      );

    const data = result[0];
    if (!data) {
      return {
        avgWordCount: 0,
        avgParaCount: 0,
        avgBurstiness: 0,
        avgTtr: 0,
        avgSentLen: 0,
        medianWordCount: 0,
        medianParaCount: 0,
      };
    }

    return {
      avgWordCount: data.avgWordCount ?? 0,
      avgParaCount: data.avgParaCount ?? 0,
      avgBurstiness: data.avgBurstiness ?? 0,
      avgTtr: data.avgTtr ?? 0,
      avgSentLen: data.avgSentLen ?? 0,
      medianWordCount: data.medianWordCount ?? 0,
      medianParaCount: data.medianParaCount ?? 0,
    };
  },

  /**
   * Get status distribution
   */
  async getStatusDistribution(userId: string): Promise<StatusDistribution[]> {
    const result = await db
      .select({
        status: styleAnalyses.status,
        count: sql<number>`COUNT(*)::int`,
        percentage: sql<number>`COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()`,
      })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt)
        )
      )
      .groupBy(styleAnalyses.status)
      .orderBy(desc(sql`COUNT(*)`));

    return result.map((row) => ({
      status: row.status,
      count: row.count,
      percentage: row.percentage ?? 0,
    }));
  },

  /**
   * Get creation trend
   */
  async getCreationTrend(
    userId: string,
    days: number = 30
  ): Promise<CreationTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db
      .select({
        date: sql<string>`date(${styleAnalyses.createdAt})::text`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt),
          gte(styleAnalyses.createdAt, startDate)
        )
      )
      .groupBy(sql`date(${styleAnalyses.createdAt})`)
      .orderBy(sql`date(${styleAnalyses.createdAt})`);

    return result.map((row) => ({
      date: row.date,
      count: row.count,
    }));
  },

  /**
   * Get word count distribution
   */
  async getWordCountDistribution(
    userId: string
  ): Promise<WordCountDistribution[]> {
    const result = await db
      .select({
        range: sql<string>`
          CASE
            WHEN ${styleAnalyses.wordCount} < 500 THEN '<500'
            WHEN ${styleAnalyses.wordCount} >= 500 AND ${styleAnalyses.wordCount} < 1000 THEN '500-1000'
            WHEN ${styleAnalyses.wordCount} >= 1000 AND ${styleAnalyses.wordCount} < 2000 THEN '1000-2000'
            WHEN ${styleAnalyses.wordCount} >= 2000 AND ${styleAnalyses.wordCount} < 5000 THEN '2000-5000'
            WHEN ${styleAnalyses.wordCount} >= 5000 AND ${styleAnalyses.wordCount} < 8000 THEN '5000-8000'
            ELSE '8000+'
          END
        `,
        count: sql<number>`COUNT(*)::int`,
        percentage: sql<number>`COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()`,
      })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt)
        )
      )
      .groupBy(sql`
        CASE
          WHEN ${styleAnalyses.wordCount} < 500 THEN '<500'
          WHEN ${styleAnalyses.wordCount} >= 500 AND ${styleAnalyses.wordCount} < 1000 THEN '500-1000'
          WHEN ${styleAnalyses.wordCount} >= 1000 AND ${styleAnalyses.wordCount} < 2000 THEN '1000-2000'
          WHEN ${styleAnalyses.wordCount} >= 2000 AND ${styleAnalyses.wordCount} < 5000 THEN '2000-5000'
          WHEN ${styleAnalyses.wordCount} >= 5000 AND ${styleAnalyses.wordCount} < 8000 THEN '5000-8000'
          ELSE '8000+'
        END
      `)
      .orderBy(sql`MIN(${styleAnalyses.wordCount})`);

    return result.map((row) => ({
      range: row.range,
      count: row.count,
      percentage: row.percentage ?? 0,
    }));
  },

  /**
   * Get TTR vs Burstiness scatter plot data
   */
  async getMetricsScatter(userId: string): Promise<MetricsScatterPoint[]> {
    const result = await db
      .select({
        id: styleAnalyses.id,
        sourceTitle: styleAnalyses.sourceTitle,
        ttr: styleAnalyses.metricsTtr,
        burstiness: styleAnalyses.metricsBurstiness,
        wordCount: styleAnalyses.wordCount,
      })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt)
        )
      )
      .orderBy(desc(styleAnalyses.createdAt));

    return result.map((row) => ({
      id: row.id,
      sourceTitle: row.sourceTitle ?? "",
      ttr: row.ttr ?? 0,
      burstiness: row.burstiness ?? 0,
      wordCount: row.wordCount ?? 0,
    }));
  },

  /**
   * Get paragraph count distribution
   */
  async getParaCountDistribution(
    userId: string
  ): Promise<ParaCountDistribution[]> {
    const result = await db
      .select({
        range: sql<string>`
          CASE
            WHEN ${styleAnalyses.paraCount} < 5 THEN '<5'
            WHEN ${styleAnalyses.paraCount} >= 5 AND ${styleAnalyses.paraCount} < 10 THEN '5-10'
            WHEN ${styleAnalyses.paraCount} >= 10 AND ${styleAnalyses.paraCount} < 20 THEN '10-20'
            WHEN ${styleAnalyses.paraCount} >= 20 AND ${styleAnalyses.paraCount} < 30 THEN '20-30'
            ELSE '30+'
          END
        `,
        count: sql<number>`COUNT(*)::int`,
        percentage: sql<number>`COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()`,
      })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt)
        )
      )
      .groupBy(sql`
        CASE
          WHEN ${styleAnalyses.paraCount} < 5 THEN '<5'
          WHEN ${styleAnalyses.paraCount} >= 5 AND ${styleAnalyses.paraCount} < 10 THEN '5-10'
          WHEN ${styleAnalyses.paraCount} >= 10 AND ${styleAnalyses.paraCount} < 20 THEN '10-20'
          WHEN ${styleAnalyses.paraCount} >= 20 AND ${styleAnalyses.paraCount} < 30 THEN '20-30'
          ELSE '30+'
        END
      `)
      .orderBy(sql`MIN(${styleAnalyses.paraCount})`);

    return result.map((row) => ({
      range: row.range,
      count: row.count,
      percentage: row.percentage ?? 0,
    }));
  },

  /**
   * Get average sentence length distribution
   */
  async getSentLenDistribution(
    userId: string
  ): Promise<SentLenDistribution[]> {
    const result = await db
      .select({
        range: sql<string>`
          CASE
            WHEN ${styleAnalyses.metricsAvgSentLen} < 10 THEN '<10'
            WHEN ${styleAnalyses.metricsAvgSentLen} >= 10 AND ${styleAnalyses.metricsAvgSentLen} < 15 THEN '10-15'
            WHEN ${styleAnalyses.metricsAvgSentLen} >= 15 AND ${styleAnalyses.metricsAvgSentLen} < 20 THEN '15-20'
            WHEN ${styleAnalyses.metricsAvgSentLen} >= 20 AND ${styleAnalyses.metricsAvgSentLen} < 25 THEN '20-25'
            ELSE '25+'
          END
        `,
        count: sql<number>`COUNT(*)::int`,
        percentage: sql<number>`COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()`,
      })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt)
        )
      )
      .groupBy(sql`
        CASE
          WHEN ${styleAnalyses.metricsAvgSentLen} < 10 THEN '<10'
          WHEN ${styleAnalyses.metricsAvgSentLen} >= 10 AND ${styleAnalyses.metricsAvgSentLen} < 15 THEN '10-15'
          WHEN ${styleAnalyses.metricsAvgSentLen} >= 15 AND ${styleAnalyses.metricsAvgSentLen} < 20 THEN '15-20'
          WHEN ${styleAnalyses.metricsAvgSentLen} >= 20 AND ${styleAnalyses.metricsAvgSentLen} < 25 THEN '20-25'
          ELSE '25+'
        END
      `)
      .orderBy(sql`MIN(${styleAnalyses.metricsAvgSentLen})`);

    return result.map((row) => ({
      range: row.range,
      count: row.count,
      percentage: row.percentage ?? 0,
    }));
  },

  /**
   * Get quality scores for all materials
   */
  async getMaterialsWithQualityScores(
    userId: string,
    limit: number = 100
  ): Promise<MaterialQualityDetail[]> {
    const materials = await db
      .select({
        id: styleAnalyses.id,
        sourceTitle: styleAnalyses.sourceTitle,
        wordCount: styleAnalyses.wordCount,
        paraCount: styleAnalyses.paraCount,
        metricsTtr: styleAnalyses.metricsTtr,
        metricsBurstiness: styleAnalyses.metricsBurstiness,
        metricsAvgSentLen: styleAnalyses.metricsAvgSentLen,
        createdAt: styleAnalyses.createdAt,
        styleIdentity: styleAnalyses.styleIdentity,
        lexicalLogic: styleAnalyses.lexicalLogic,
        rhetoricLogic: styleAnalyses.rhetoricLogic,
        coreRules: styleAnalyses.coreRules,
        blueprint: styleAnalyses.blueprint,
        useCount: sql<number>`COUNT(${tasks.id})::int`,
      })
      .from(styleAnalyses)
      .leftJoin(
        tasks,
        and(
          eq(tasks.refMaterialId, styleAnalyses.id),
          isNull(tasks.deletedAt)
        )
      )
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt)
        )
      )
      .groupBy(
        styleAnalyses.id,
        styleAnalyses.sourceTitle,
        styleAnalyses.wordCount,
        styleAnalyses.paraCount,
        styleAnalyses.metricsTtr,
        styleAnalyses.metricsBurstiness,
        styleAnalyses.metricsAvgSentLen,
        styleAnalyses.createdAt,
        styleAnalyses.styleIdentity,
        styleAnalyses.lexicalLogic,
        styleAnalyses.rhetoricLogic,
        styleAnalyses.coreRules,
        styleAnalyses.blueprint
      )
      .orderBy(desc(styleAnalyses.createdAt))
      .limit(limit);

    return materials.map((material) => {
      const qualityScore = calculateQualityScore({
        wordCount: material.wordCount,
        paraCount: material.paraCount,
        metricsTtr: material.metricsTtr,
        metricsBurstiness: material.metricsBurstiness,
        metricsAvgSentLen: material.metricsAvgSentLen,
        useCount: material.useCount,
        createdAt: material.createdAt,
        styleIdentity: material.styleIdentity,
        lexicalLogic: material.lexicalLogic,
        rhetoricLogic: material.rhetoricLogic,
        coreRules: material.coreRules,
        blueprint: material.blueprint,
      });

      return {
        id: material.id,
        sourceTitle: material.sourceTitle ?? "",
        qualityScore,
        issues: [], // Issue detection to be implemented
        createdAt: material.createdAt,
        lastUsedAt: null, // To be calculated from tasks table
      };
    });
  },

  /**
   * Get type distribution statistics
   */
  async getTypeDistribution(userId: string): Promise<TypeDistribution[]> {
    const result = await db
      .select({
        type: styleAnalyses.primaryType,
        count: sql<number>`COUNT(DISTINCT ${styleAnalyses.id})::int`,
        percentage: sql<number>`COUNT(DISTINCT ${styleAnalyses.id}) * 100.0 / SUM(COUNT(DISTINCT ${styleAnalyses.id})) OVER ()`,
        avgWordCount: sql<number>`AVG(${styleAnalyses.wordCount})::float`,
        avgParaCount: sql<number>`AVG(${styleAnalyses.paraCount})::float`,
        avgBurstiness: sql<number>`AVG(${styleAnalyses.metricsBurstiness})::float`,
        avgTtr: sql<number>`AVG(${styleAnalyses.metricsTtr})::float`,
        avgSentLen: sql<number>`AVG(${styleAnalyses.metricsAvgSentLen})::float`,
        totalUsageCount: sql<number>`COUNT(${tasks.id})::int`,
        usedCount: sql<number>`COUNT(DISTINCT CASE WHEN ${tasks.id} IS NOT NULL THEN ${styleAnalyses.id} END)::int`,
      })
      .from(styleAnalyses)
      .leftJoin(
        tasks,
        and(
          eq(tasks.refMaterialId, styleAnalyses.id),
          isNull(tasks.deletedAt)
        )
      )
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt)
        )
      )
      .groupBy(styleAnalyses.primaryType)
      .orderBy(desc(sql`COUNT(DISTINCT ${styleAnalyses.id})`));

    return result.map((row) => {
      const count = row.count;
      const totalUsageCount = row.totalUsageCount ?? 0;
      const avgUsageCount = count > 0 ? totalUsageCount / count : 0;

      return {
        type: row.type ?? "unknown",
        count,
        percentage: row.percentage ?? 0,
        avgWordCount: row.avgWordCount ?? 0,
        avgParaCount: row.avgParaCount ?? 0,
        avgBurstiness: row.avgBurstiness ?? 0,
        avgTtr: row.avgTtr ?? 0,
        avgSentLen: row.avgSentLen ?? 0,
        avgUsageCount,
        totalUsageCount,
        usageRate: count > 0 ? ((row.usedCount ?? 0) / count) * 100 : 0,
      };
    });
  },

  /**
   * Get type trend over time
   */
  async getTypeTrend(userId: string, days: number = 90): Promise<TypeTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db
      .select({
        date: sql<string>`date(${styleAnalyses.createdAt})::text`,
        type: styleAnalyses.primaryType,
        count: sql<number>`COUNT(*)::int`,
        cumulativeCount: sql<number>`SUM(COUNT(*)) OVER (PARTITION BY ${styleAnalyses.primaryType} ORDER BY date(${styleAnalyses.createdAt}))::int`,
      })
      .from(styleAnalyses)
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt),
          gte(styleAnalyses.createdAt, startDate)
        )
      )
      .groupBy(sql`date(${styleAnalyses.createdAt})`, styleAnalyses.primaryType)
      .orderBy(sql`date(${styleAnalyses.createdAt})`, styleAnalyses.primaryType);

    return result.map((row) => ({
      date: row.date,
      type: row.type ?? "unknown",
      count: row.count,
      cumulativeCount: row.cumulativeCount,
    }));
  },

  /**
   * Get top used materials
   */
  async getTopUsedMaterials(userId: string, limit: number = 20): Promise<TopUsedMaterial[]> {
    const materials = await db
      .select({
        id: styleAnalyses.id,
        sourceTitle: styleAnalyses.sourceTitle,
        styleName: styleAnalyses.styleName,
        primaryType: styleAnalyses.primaryType,
        wordCount: styleAnalyses.wordCount,
        paraCount: styleAnalyses.paraCount,
        metricsTtr: styleAnalyses.metricsTtr,
        metricsBurstiness: styleAnalyses.metricsBurstiness,
        metricsAvgSentLen: styleAnalyses.metricsAvgSentLen,
        createdAt: styleAnalyses.createdAt,
        styleIdentity: styleAnalyses.styleIdentity,
        lexicalLogic: styleAnalyses.lexicalLogic,
        rhetoricLogic: styleAnalyses.rhetoricLogic,
        coreRules: styleAnalyses.coreRules,
        blueprint: styleAnalyses.blueprint,
        useCount: sql<number>`COUNT(${tasks.id})::int`,
      })
      .from(styleAnalyses)
      .leftJoin(
        tasks,
        and(
          eq(tasks.refMaterialId, styleAnalyses.id),
          isNull(tasks.deletedAt)
        )
      )
      .where(
        and(
          eq(styleAnalyses.userId, userId),
          isNull(styleAnalyses.deletedAt)
        )
      )
      .groupBy(
        styleAnalyses.id,
        styleAnalyses.sourceTitle,
        styleAnalyses.styleName,
        styleAnalyses.primaryType,
        styleAnalyses.wordCount,
        styleAnalyses.paraCount,
        styleAnalyses.metricsTtr,
        styleAnalyses.metricsBurstiness,
        styleAnalyses.metricsAvgSentLen,
        styleAnalyses.createdAt,
        styleAnalyses.styleIdentity,
        styleAnalyses.lexicalLogic,
        styleAnalyses.rhetoricLogic,
        styleAnalyses.coreRules,
        styleAnalyses.blueprint
      )
      .orderBy(desc(sql<number>`COUNT(${tasks.id})`))
      .limit(limit);

    return materials.map((material) => {
      const daysSinceCreation = Math.floor(
        (Date.now() - material.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const usageFrequency = daysSinceCreation > 0 ? material.useCount / daysSinceCreation : 0;

      const qualityScore = calculateQualityScore({
        wordCount: material.wordCount,
        paraCount: material.paraCount,
        metricsTtr: material.metricsTtr,
        metricsBurstiness: material.metricsBurstiness,
        metricsAvgSentLen: material.metricsAvgSentLen,
        useCount: material.useCount,
        createdAt: material.createdAt,
        styleIdentity: material.styleIdentity,
        lexicalLogic: material.lexicalLogic,
        rhetoricLogic: material.rhetoricLogic,
        coreRules: material.coreRules,
        blueprint: material.blueprint,
      });

      return {
        id: material.id,
        sourceTitle: material.sourceTitle ?? "",
        styleName: material.styleName ?? "",
        primaryType: material.primaryType ?? "unknown",
        useCount: material.useCount,
        lastUsedAt: null, // To be calculated from tasks table
        firstUsedAt: null, // To be calculated from tasks table
        wordCount: material.wordCount ?? 0,
        qualityScore: qualityScore.totalScore,
        grade: qualityScore.grade,
        daysSinceCreation,
        daysSinceLastUse: null, // To be calculated from tasks table
        usageFrequency,
      };
    });
  },
};

export type MaterialAnalyticsService = typeof materialAnalyticsService;
