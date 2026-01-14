/**
 * Pipelines Table (工作流追踪)
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { styleAnalyses } from "./style-analyses";
import { imagePrompts } from "./image-prompts";
import { tasks } from "./tasks";
import { xhsImageJobs } from "./xhs";
import { pipelineStatusEnum } from "../enums";

// ==================== Pipelines Table ====================

export const pipelines = pgTable(
  "pipelines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // 使用 set null 而非 cascade，保留历史记录用于审计追踪
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    // 输入
    sourceUrl: text("source_url").notNull(),
    topic: text("topic").notNull(),
    keywords: text("keywords"),
    targetWordCount: integer("target_word_count").default(2000),

    // 关联的风格分析
    styleAnalysisId: uuid("style_analysis_id").references(() => styleAnalyses.id, { onDelete: "set null" }),

    // 用户选择的封面风格
    imagePromptId: uuid("image_prompt_id").references(() => imagePrompts.id, { onDelete: "set null" }),

    // 生成结果关联
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    xhsJobId: uuid("xhs_job_id").references(() => xhsImageJobs.id, { onDelete: "set null" }),

    // 状态
    status: pipelineStatusEnum("status").default("analyzing").notNull(),
    errorMessage: text("error_message"),

    // 进度追踪
    articleTotalChapters: integer("article_total_chapters").default(0),
    articleCompletedChapters: integer("article_completed_chapters").default(0),
    xhsTotalImages: integer("xhs_total_images").default(0),
    xhsCompletedImages: integer("xhs_completed_images").default(0),

    // 时间戳
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    userIdIdx: index("idx_pipelines_user_id").on(table.userId),
    statusIdx: index("idx_pipelines_status").on(table.status),
    userStatusIdx: index("idx_pipelines_user_status").on(table.userId, table.status),
    createdAtIdx: index("idx_pipelines_created_at").on(table.createdAt),
  })
);

// ==================== Type Exports ====================

export type Pipeline = typeof pipelines.$inferSelect;
export type NewPipeline = typeof pipelines.$inferInsert;
