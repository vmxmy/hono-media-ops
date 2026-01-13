/**
 * Tasks & Executions Tables
 */

import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { taskStatusEnum, executionStatusEnum } from "../enums";
import type {
  ExecutionResult,
  WechatMediaInfo,
  BlueprintIdentity,
  BlueprintStyleConfig,
  BlueprintAct,
  BlueprintParagraph,
} from "../jsonb-types";

// ==================== Tasks Table ====================

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    topic: text("topic").notNull(),
    keywords: text("keywords"),
    totalWordCount: integer("total_word_count").default(4000).notNull(),
    status: taskStatusEnum("status").default("pending").notNull(),
    // Cover prompt (link to image_prompts, n8n queries by this ID)
    coverPromptId: uuid("cover_prompt_id"),
    // Reference material (link to reverse_engineering)
    refMaterialId: uuid("ref_material_id"),
    // Writing progress (updated by n8n during chapter loop)
    currentChapter: integer("current_chapter"),
    totalChapters: integer("total_chapters"),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    userIdIdx: index("idx_tasks_user_id").on(table.userId),
    statusIdx: index("idx_tasks_status").on(table.status),
    createdAtIdx: index("idx_tasks_created_at").on(table.createdAt),
    statusCreatedIdx: index("idx_tasks_status_created").on(
      table.status,
      table.createdAt
    ),
    userStatusIdx: index("idx_tasks_user_status").on(table.userId, table.status),
  })
);

// ==================== Task Executions Table ====================

export const taskExecutions = pgTable(
  "task_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    n8nExecutionId: text("n8n_execution_id"),
    status: executionStatusEnum("status").default("running").notNull(),
    errorMessage: text("error_message"),
    // JSONB for input snapshot and result metadata
    inputSnapshot: jsonb("input_snapshot"),
    result: jsonb("result").$type<ExecutionResult>(),
    // Article content (separate columns for performance)
    articleTitle: text("article_title"),
    articleSubtitle: text("article_subtitle"),
    articleMarkdown: text("article_markdown"),
    articleHtml: text("article_html"),
    articleWordCount: integer("article_word_count"),
    // WeChat media upload result
    wechatMediaInfo: jsonb("wechat_media_info").$type<WechatMediaInfo>(),
    // Timestamps
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
  },
  (table) => ({
    taskIdIdx: index("idx_executions_task_id").on(table.taskId),
    statusIdx: index("idx_executions_status").on(table.status),
    startedAtIdx: index("idx_executions_started_at").on(table.startedAt),
    // Composite index for task execution history
    taskStartedIdx: index("idx_executions_task_started").on(
      table.taskId,
      table.startedAt
    ),
  })
);

// ==================== Task Blueprints Table (写作蓝图) ====================

export const taskBlueprints = pgTable(
  "task_blueprints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => taskExecutions.id, { onDelete: "cascade" })
      .unique(),

    // ==================== 核心字段（便于查询） ====================
    topic: text("topic").notNull(),
    wordCount: integer("word_count").notNull(),
    strategy: text("strategy").notNull(),              // CURATION, ORIGINAL, etc.
    strategyConfidence: text("strategy_confidence"),   // high, medium, low
    totalActs: integer("total_acts").notNull(),
    totalParagraphs: integer("total_paragraphs").notNull(),

    // ==================== JSONB 结构化字段 ====================
    sourcedFacts: jsonb("sourced_facts").$type<string[]>(),
    identity: jsonb("identity").$type<BlueprintIdentity>(),
    styleConfig: jsonb("style_config").$type<BlueprintStyleConfig>(),
    structuralMap: jsonb("structural_map").$type<BlueprintAct[]>().notNull(),
    paragraphs: jsonb("paragraphs").$type<BlueprintParagraph[]>().notNull(),

    // ==================== 元数据 ====================
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    executionIdIdx: uniqueIndex("idx_task_blueprints_execution_id").on(table.executionId),
    strategyIdx: index("idx_task_blueprints_strategy").on(table.strategy),
    createdAtIdx: index("idx_task_blueprints_created_at").on(table.createdAt),
  })
);

// ==================== Chapter Outputs Table (章节内容) ====================

export const chapterOutputs = pgTable(
  "chapter_outputs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blueprintId: uuid("blueprint_id")
      .notNull()
      .references(() => taskBlueprints.id, { onDelete: "cascade" }),

    // ==================== 章节标识 ====================
    actNumber: integer("act_number").notNull(),      // 幕号 1-6
    actName: text("act_name"),                       // 幕名

    // ==================== 生成内容 ====================
    rawContent: text("raw_content"),                 // 内容写作 原始输出
    formattedContent: text("formatted_content"),     // 排版大师 输出
    wordCount: integer("word_count"),

    // ==================== 状态 ====================
    status: text("status").default("pending"),       // pending, writing, completed, failed
    errorMessage: text("error_message"),

    // ==================== 时间戳 ====================
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    blueprintIdIdx: index("idx_chapter_outputs_blueprint_id").on(table.blueprintId),
    blueprintActIdx: uniqueIndex("idx_chapter_outputs_blueprint_act").on(
      table.blueprintId,
      table.actNumber
    ),
  })
);

// ==================== Type Exports ====================

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TaskExecution = typeof taskExecutions.$inferSelect;
export type NewTaskExecution = typeof taskExecutions.$inferInsert;

export type TaskBlueprint = typeof taskBlueprints.$inferSelect;
export type NewTaskBlueprint = typeof taskBlueprints.$inferInsert;

export type ChapterOutput = typeof chapterOutputs.$inferSelect;
export type NewChapterOutput = typeof chapterOutputs.$inferInsert;
