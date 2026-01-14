/**
 * Xiaohongshu (小红书) Tables
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
import { xhsJobStatusEnum, xhsImageTypeEnum } from "../enums";

// ==================== XHS Image Jobs Table (小红书图片生成任务) ====================

export const xhsImageJobs = pgTable(
  "xhs_image_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    // 来源信息
    sourceUrl: text("source_url").notNull(),           // 原始文章链接
    sourceTitle: text("source_title"),                 // 文章标题

    // 生成配置
    totalImages: integer("total_images").notNull(),    // 计划生成的图片总数
    ratio: text("ratio").default("3:4"),               // 默认比例
    resolution: text("resolution").default("2K"),      // 默认分辨率

    // 执行状态
    status: xhsJobStatusEnum("status").default("pending").notNull(),
    completedImages: integer("completed_images").default(0).notNull(),
    errorMessage: text("error_message"),

    // n8n 关联
    n8nExecutionId: text("n8n_execution_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // 扩展元数据
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // 时间戳
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    userIdIdx: index("idx_xhs_image_jobs_user_id").on(table.userId),
    statusIdx: index("idx_xhs_image_jobs_status").on(table.status),
    createdAtIdx: index("idx_xhs_image_jobs_created_at").on(table.createdAt),
    sourceUrlIdx: index("idx_xhs_image_jobs_source_url").on(table.sourceUrl),
    userStatusIdx: index("idx_xhs_image_jobs_user_status").on(table.userId, table.status),
  })
);

// ==================== XHS Images Table (小红书图片详情) ====================

export const xhsImages = pgTable(
  "xhs_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => xhsImageJobs.id, { onDelete: "cascade" }),

    // 序号和类型
    index: integer("index").notNull(),                 // 图片序号 (1-based)
    type: xhsImageTypeEnum("type").notNull(),          // cover/content/ending

    // 图片存储
    wechatMediaId: text("wechat_media_id"),            // 微信素材库 media_id
    wechatUrl: text("wechat_url"),                     // 微信 CDN URL
    r2Url: text("r2_url"),                             // Cloudflare R2 URL

    // 内容信息
    coreMessage: text("core_message"),                 // 核心信息
    textContent: text("text_content"),                 // 图片上的文字内容

    // 生成参数
    imagePrompt: text("image_prompt"),                 // 图片生成提示词
    ratio: text("ratio").default("3:4"),               // 比例
    resolution: text("resolution").default("2K"),      // 分辨率

    // 扩展元数据
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // 时间戳
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    jobIdIdx: index("idx_xhs_images_job_id").on(table.jobId),
    typeIdx: index("idx_xhs_images_type").on(table.type),
    jobIndexIdx: uniqueIndex("idx_xhs_images_job_index").on(table.jobId, table.index),
  })
);

// ==================== Type Exports ====================

export type XhsImageJob = typeof xhsImageJobs.$inferSelect;
export type NewXhsImageJob = typeof xhsImageJobs.$inferInsert;

export type XhsImage = typeof xhsImages.$inferSelect;
export type NewXhsImage = typeof xhsImages.$inferInsert;
