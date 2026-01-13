/**
 * Image Prompts Table
 */

import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { imagePromptSourceEnum } from "../enums";

// ==================== Image Prompts Table ====================

export const imagePrompts = pgTable(
  "image_prompts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    // 基础信息
    title: text("title").notNull(),
    prompt: text("prompt").notNull(),
    negativePrompt: text("negative_prompt"),
    // 生成参数
    model: text("model").default("jimeng-4.5"),
    ratio: text("ratio").default("1:1"),
    resolution: text("resolution").default("2k"),
    // 分类标签
    category: text("category").default("general"),
    tags: jsonb("tags").$type<string[]>(),
    // 预览图
    previewUrl: text("preview_url"),
    previewR2Key: text("preview_r2_key"),
    // 使用统计
    useCount: integer("use_count").default(0).notNull(),
    lastUsedAt: timestamp("last_used_at"),
    // 来源追踪
    source: imagePromptSourceEnum("source").default("manual"),
    sourceRef: text("source_ref"),
    // 公开/私有 & 评分
    isPublic: integer("is_public").default(0).notNull(), // 0=私有, 1=公开
    rating: integer("rating").default(0).notNull(), // 0-5 星评分
    // 扩展
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    // 时间戳
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    userIdIdx: index("idx_image_prompts_user_id").on(table.userId),
    categoryIdx: index("idx_image_prompts_category").on(table.category),
    isPublicIdx: index("idx_image_prompts_is_public").on(table.isPublic),
    useCountIdx: index("idx_image_prompts_use_count").on(table.useCount),
    createdAtIdx: index("idx_image_prompts_created_at").on(table.createdAt),
    // 复合索引
    userCategoryIdx: index("idx_image_prompts_user_category").on(
      table.userId,
      table.category
    ),
    // 排序优化索引 (useCount DESC, createdAt DESC)
    useCountCreatedIdx: index("idx_image_prompts_use_count_created").on(
      table.useCount,
      table.createdAt
    ),
  })
);

// ==================== Type Exports ====================

export type ImagePrompt = typeof imagePrompts.$inferSelect;
export type NewImagePrompt = typeof imagePrompts.$inferInsert;
