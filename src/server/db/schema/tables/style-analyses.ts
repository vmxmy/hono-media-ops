/**
 * Style Analyses Table (风格分析 v8.0)
 */

import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  real,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { reverseLogStatusEnum } from "../enums";
import { vector } from "../custom-types";
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
} from "../jsonb-types";

// ==================== Style Analyses Table ====================

export const styleAnalyses = pgTable(
  "style_analyses",
  {
    // ========== 主键 ==========
    id: uuid("id").primaryKey().defaultRandom(),

    // ========== 用户关联 ==========
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // ========== 时间戳 ==========
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    // ========== 基础识别 ==========
    sourceUrl: text("source_url"),
    sourceTitle: text("source_title"),
    styleName: text("style_name"), // 风格名称
    primaryType: text("primary_type"), // narrative, tutorial, opinion, etc.
    analysisVersion: text("analysis_version"), // 分析版本号
    executionPrompt: text("execution_prompt"), // 执行提示词
    wordCount: integer("word_count"),
    paraCount: integer("para_count"),
    useCount: integer("use_count").default(0).notNull(),

    // ========== 数值指标（策略层数据，非 jsonb）==========
    metricsBurstiness: real("metrics_burstiness"), // 句长突变度
    metricsTtr: real("metrics_ttr"), // 词汇丰富度 TTR (0-1)
    metricsAvgSentLen: real("metrics_avg_sent_len"), // 平均句长（字符数）

    // ========== 策略层：jsonb ==========
    styleIdentity: jsonb("style_identity").$type<StyleIdentityData>(),
    metricsConstraints: jsonb("metrics_constraints").$type<MetricsConstraintsData>(),
    lexicalLogic: jsonb("lexical_logic").$type<LexicalLogicData>(),
    rhetoricLogic: jsonb("rhetoric_logic").$type<RhetoricLogicData>(),
    goldenSample: jsonb("golden_sample").$type<GoldenSampleData>(),
    transferDemo: jsonb("transfer_demo").$type<TransferDemoData>(),

    // ========== 数组层：jsonb (各段规则 / 结构) ==========
    coreRules: jsonb("core_rules").$type<CoreRuleItem[]>(),
    blueprint: jsonb("blueprint").$type<BlueprintItem[]>(),
    antiPatterns: jsonb("anti_patterns").$type<AntiPatternItem[]>(),

    // ========== 备份 & 状态 ==========
    rawJsonFull: jsonb("raw_json_full"),
    metadata: jsonb("metadata"), // 解析元数据 (parse_success, parser_version, validation_*)
    debug: jsonb("_debug"), // n8n 调试信息
    status: reverseLogStatusEnum("status").default("PENDING").notNull(),
    useCount: integer("use_count").default(0).notNull(), // 使用次数

    // ========== 向量搜索 ==========
    embedding: vector("embedding", { dimensions: 1024 }), // DashScope text-embedding-v3
    embeddingContentHash: text("embedding_content_hash"), // 用于检测内容变化
    embeddingModelVersion: text("embedding_model_version"), // 嵌入模型版本
  },
  (table) => ({
    // 用户查询（最常用）
    userIdIdx: index("idx_style_analyses_user_id").on(table.userId),
    // 时间排序
    createdAtIdx: index("idx_style_analyses_created_at").on(table.createdAt),
    updatedAtIdx: index("idx_style_analyses_updated_at").on(table.updatedAt),
    // 组合索引（用户 + 更新时间）用于列表查询
    userUpdatedIdx: index("idx_style_analyses_user_updated").on(
      table.userId,
      table.updatedAt
    ),
    // 组合索引（用户 + 创建时间）
    userCreatedIdx: index("idx_style_analyses_user_created").on(
      table.userId,
      table.createdAt
    ),
    // 状态筛选
    statusIdx: index("idx_style_analyses_status").on(table.status),
    // 类型筛选
    primaryTypeIdx: index("idx_style_analyses_primary_type").on(table.primaryType),
    // source_url 普通索引
    sourceUrlIdx: index("idx_style_analyses_source_url").on(table.sourceUrl),
    // source_url 唯一约束
    sourceUrlUnique: unique("style_analyses_source_url_key").on(table.sourceUrl),
  })
);

// Backwards compatibility alias
export const reverseEngineering = styleAnalyses;

// ==================== Type Exports ====================

export type StyleAnalysis = typeof styleAnalyses.$inferSelect;
export type NewStyleAnalysis = typeof styleAnalyses.$inferInsert;

// Backwards compatibility aliases (deprecated)
export type ReverseEngineering = StyleAnalysis;
export type NewReverseEngineering = NewStyleAnalysis;
