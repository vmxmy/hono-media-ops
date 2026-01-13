/**
 * Article Embeddings Table (向量搜索)
 */

import {
  pgTable,
  text,
  uuid,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tasks, taskExecutions } from "./tasks";
import { vector } from "../custom-types";

// ==================== Article Embeddings Table ====================

export const articleEmbeddings = pgTable(
  "article_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // 关联到 task_executions，因为文章内容在那里
    executionId: uuid("execution_id")
      .notNull()
      .references(() => taskExecutions.id, { onDelete: "cascade" })
      .unique(),
    // 关联到 task，方便查询
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    // 向量嵌入 (OpenAI text-embedding-3-small = 1536 dimensions)
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    // 用于生成嵌入的文本内容摘要 (用于调试和重新生成)
    contentHash: text("content_hash").notNull(),
    // 嵌入模型版本
    modelVersion: text("model_version").default("text-embedding-3-small").notNull(),
    // 时间戳
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    executionIdIdx: index("idx_article_embeddings_execution_id").on(table.executionId),
    taskIdIdx: index("idx_article_embeddings_task_id").on(table.taskId),
    // 向量索引需要在数据库层面使用 SQL 创建
    // CREATE INDEX idx_article_embeddings_vector ON article_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  })
);

// ==================== Type Exports ====================

export type ArticleEmbedding = typeof articleEmbeddings.$inferSelect;
export type NewArticleEmbedding = typeof articleEmbeddings.$inferInsert;
