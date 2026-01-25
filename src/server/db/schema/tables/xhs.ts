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
import { imagePrompts } from "./image-prompts";
import { xhsJobStatusEnum, xhsImageTypeEnum, xhsPublishStatusEnum } from "../enums";

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

    // 发布状态
    publishStatus: xhsPublishStatusEnum("publish_status").default("not_published").notNull(),
    publishedAt: timestamp("published_at"),
    xhsNoteId: text("xhs_note_id"),                    // 小红书笔记 ID
    publishErrorMessage: text("publish_error_message"), // 发布失败原因

    // 重试所需字段
    imagePromptId: uuid("image_prompt_id")
      .references(() => imagePrompts.id, { onDelete: "set null" }),
    inputContent: text("input_content"),               // 用户原始输入内容
    stylePrompt: text("style_prompt"),                 // AI 风格提示词
    generatedConfig: jsonb("generated_config")         // AI 生成的图片配置
      .$type<GeneratedImageConfig[]>(),

    // 内容分类体系
    track: text("track"),                                   // 内容赛道
    category: text("category"),                             // 内容类型
    metaAttributes: jsonb("meta_attributes").$type<XhsMetaAttributes>(), // 元属性
    tags: jsonb("tags").$type<string[]>(),                  // 标签
    keywords: jsonb("keywords").$type<string[]>(),          // SEO关键词

    // 扩展元数据 (保留用于其他扩展数据)
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
    publishStatusIdx: index("idx_xhs_image_jobs_publish_status").on(table.publishStatus),
    createdAtIdx: index("idx_xhs_image_jobs_created_at").on(table.createdAt),
    sourceUrlIdx: index("idx_xhs_image_jobs_source_url").on(table.sourceUrl),
    userStatusIdx: index("idx_xhs_image_jobs_user_status").on(table.userId, table.status),
    xhsNoteIdIdx: index("idx_xhs_image_jobs_xhs_note_id").on(table.xhsNoteId),
    imagePromptIdIdx: index("idx_xhs_image_jobs_image_prompt_id").on(table.imagePromptId),
    // 内容分类索引
    trackIdx: index("idx_xhs_image_jobs_track").on(table.track),
    categoryIdx: index("idx_xhs_image_jobs_category").on(table.category),
    trackCategoryIdx: index("idx_xhs_image_jobs_track_category").on(table.track, table.category),
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

// 元属性类型定义

// 探店类元属性
export interface ExploreMetaAttributes {
  shop_name: string;
  shop_type?: string;
  address?: string;
  city?: string;
  district?: string;
  opening_date?: string;
  price_range?: string;
  must_try?: string[];
  business_hours?: string;
  best_time?: string;
  transportation?: string;
  reservation_required?: boolean;
  pet_friendly?: boolean;
  parking_available?: boolean;
  wifi_available?: boolean;
  phone?: string;
  features?: string[];
}

// 测评类元属性
export interface ReviewMetaAttributes {
  product_name: string;
  brand?: string;
  price?: number;
  capacity?: string;
  rating?: number;
  pros?: string[];
  cons?: string[];
  suitable_for?: string[];
  usage_duration?: string;
  repurchase?: boolean;
  alternatives?: string[];
  purchase_channel?: string;
  ingredients?: string[];
  specifications?: Record<string, string>;
}

// 教程类元属性
export interface TutorialMetaAttributes {
  title: string;
  difficulty?: "easy" | "medium" | "hard";
  time_required?: string;
  steps?: number;
  materials_needed?: string[];
  suitable_for?: string[];
  occasion?: string[];
  season?: string[];
  skills_learned?: string[];
  video_duration?: string;
}

// 干货科普类元属性
export interface KnowledgeMetaAttributes {
  topic: string;
  knowledge_depth?: "beginner" | "intermediate" | "advanced";
  reading_time?: string;
  key_points?: string[];
  references?: string[];
  target_audience?: string[];
  myths_busted?: string[];
  actionable_tips?: string[];
}

// 种草推荐类元属性
export interface RecommendationMetaAttributes {
  list_title?: string;
  item_count?: number;
  total_budget?: string;
  items?: Array<{
    name: string;
    price?: number;
    purchase_link?: string;
    reason?: string;
    priority?: number;
  }>;
  update_frequency?: string;
  affiliate?: boolean;
  target_group?: string[];
}

// 旅行攻略类元属性
export interface TravelMetaAttributes {
  destination: string;
  trip_duration?: string;
  budget?: string;
  best_season?: string;
  itinerary?: Array<{
    day: number;
    activities: string[];
    meals?: string[];
    accommodation?: string;
  }>;
  transportation?: string;
  must_dos?: string[];
  must_eats?: string[];
  tips?: string[];
  avoid?: string[];
}

// 合集/榜单类元属性
export interface CollectionMetaAttributes {
  list_title: string;
  item_count: number;
  ranking_criteria?: string;
  items: Array<{
    rank: number;
    name: string;
    description?: string;
    score?: number;
    image_url?: string;
  }>;
  update_date?: string;
  data_source?: string;
}

// 元属性联合类型
export type XhsMetaAttributes =
  | ExploreMetaAttributes
  | ReviewMetaAttributes
  | TutorialMetaAttributes
  | KnowledgeMetaAttributes
  | RecommendationMetaAttributes
  | TravelMetaAttributes
  | CollectionMetaAttributes;

// 生成配置类型
export interface GeneratedImageConfig {
  index: number;
  type: "cover" | "info_card" | "content" | "ending";
  title: string;
  subtitle?: string;
  body_points?: string[];
  image_prompt: string;
  visual_elements?: string[];
  color_scheme?: string;
  ratio: string;
  watermark?: string;
}

export type XhsImageJob = typeof xhsImageJobs.$inferSelect;
export type NewXhsImageJob = typeof xhsImageJobs.$inferInsert;

export type XhsImage = typeof xhsImages.$inferSelect;
export type NewXhsImage = typeof xhsImages.$inferInsert;
