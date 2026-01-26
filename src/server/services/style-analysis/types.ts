/**
 * Style Analysis Service Types
 * Shared type definitions used across style analysis services
 */

import type {
  StyleIdentityData,
  MetricsConstraintsData,
  LexicalLogicData,
  RhetoricLogicData,
  GoldenSampleData,
  TransferDemoData,
  CoreRuleItem,
  BlueprintItem,
  AntiPatternItem,
} from "@/server/db/schema";
import { z } from "zod";

// ==================== Query Options ====================

export interface GetAllStyleAnalysesOptions {
  page: number;
  pageSize: number;
  search?: string;
  primaryType?: string;
  status?: string;
  userId?: string;
  sortMode?: "default" | "reverse";
}

// ==================== Input Types ====================

export interface CreateStyleAnalysisInput {
  userId: string;
  // 基础识别
  sourceUrl?: string;
  sourceTitle?: string;
  styleName?: string;
  primaryType?: string;
  analysisVersion?: string;
  executionPrompt?: string;
  wordCount?: number;
  paraCount?: number;
  // 数值指标
  metricsBurstiness?: number;
  metricsTtr?: number;
  metricsAvgSentLen?: number;
  // 策略层 JSONB
  styleIdentity?: StyleIdentityData;
  metricsConstraints?: MetricsConstraintsData;
  lexicalLogic?: LexicalLogicData;
  rhetoricLogic?: RhetoricLogicData;
  goldenSample?: GoldenSampleData;
  transferDemo?: TransferDemoData;
  // 数组层 JSONB
  coreRules?: CoreRuleItem[];
  blueprint?: BlueprintItem[];
  antiPatterns?: AntiPatternItem[];
  // 备份
  rawJsonFull?: Record<string, unknown>;
  // 解析元数据
  metadata?: Record<string, unknown>;
  status?: "PENDING" | "SUCCESS" | "FAILED";
}

export interface UpdateStyleAnalysisInput {
  id: string;
  sourceTitle?: string;
  styleName?: string;
  primaryType?: string;
  analysisVersion?: string;
  executionPrompt?: string;
  styleIdentity?: StyleIdentityData;
  metricsConstraints?: MetricsConstraintsData;
  lexicalLogic?: LexicalLogicData;
  rhetoricLogic?: RhetoricLogicData;
  goldenSample?: GoldenSampleData;
  transferDemo?: TransferDemoData;
  coreRules?: CoreRuleItem[];
  blueprint?: BlueprintItem[];
  antiPatterns?: AntiPatternItem[];
  status?: "PENDING" | "SUCCESS" | "FAILED";
}

// ==================== Analytics Types ====================

/** 用户写作风格画像 */
export interface UserStyleProfile {
  userId: string;
  totalAnalyses: number;
  /** 最常用的文章类型及占比 */
  topPrimaryTypes: Array<{ primaryType: string; count: number; percentage: number }>;
  /** 平均指标 */
  averageMetrics: {
    wordCount: number | null;
    paraCount: number | null;
    burstiness: number | null;
    ttr: number | null;
  };
  /** 常用语气关键词 */
  commonToneKeywords: string[];
  /** 最近分析时间 */
  lastAnalysisAt: Date | null;
}

/** 指标趋势数据点 */
export interface MetricsTrendPoint {
  date: string;
  wordCount: number | null;
  paraCount: number | null;
  burstiness: number | null;
  ttr: number | null;
  count: number;
}

/** 类型洞察结果 */
export interface PrimaryTypeInsights {
  primaryType: string;
  totalAnalyses: number;
  metrics: {
    wordCount: {
      avg: number | null;
      min: number | null;
      max: number | null;
    };
    paraCount: {
      avg: number | null;
    };
    burstiness: {
      avg: number | null;
    };
    ttr: {
      avg: number | null;
    };
  };
}

/** Style analysis list item with computed use count */
export interface StyleAnalysisListItem {
  id: string;
  userId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  styleName: string | null;
  primaryType: string | null;
  analysisVersion: string | null;
  wordCount: number | null;
  paraCount: number | null;
  metricsBurstiness: number | null;
  metricsTtr: number | null;
  status: "PENDING" | "SUCCESS" | "FAILED";
  styleIdentity: Record<string, unknown> | null;
  lexicalLogic: Record<string, unknown> | null;
  metricsConstraints: Record<string, unknown> | null;
  rhetoricLogic: Record<string, unknown> | null;
  coreRules: Array<Record<string, unknown>> | null;
  blueprint: Array<Record<string, unknown>> | null;
  antiPatterns: Array<Record<string, unknown>> | null;
  goldenSample: Record<string, unknown> | null;
  transferDemo: Record<string, unknown> | null;
  executionPrompt: string | null;
  useCount: number;
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Paginated style analysis list result */
export interface GetAllStyleAnalysesResult {
  logs: StyleAnalysisListItem[];
  pagination: PaginationMeta;
}
