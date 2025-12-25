import {
  pgTable,
  pgEnum,
  text,
  uuid,
  timestamp,
  integer,
  real,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==================== Enum Types ====================

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const executionStatusEnum = pgEnum("execution_status", [
  "running",
  "completed",
  "failed",
]);

export const reverseLogStatusEnum = pgEnum("reverse_log_status", [
  "SUCCESS",
  "FAILED",
  "PENDING",
]);

// ==================== Users Table ====================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    accessCode: text("access_code").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    usernameIdx: uniqueIndex("idx_users_username").on(table.username),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  reverseEngineeringLogs: many(reverseEngineeringLogs),
}));

// ==================== Tasks Table ====================

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    topic: text("topic").notNull(),
    keywords: text("keywords"),
    status: taskStatusEnum("status").default("pending").notNull(),
    // Cover config fields
    coverPrompt: text("cover_prompt"),
    coverRatio: text("cover_ratio").default("16:9"),
    coverResolution: text("cover_resolution").default("1k"),
    coverModel: text("cover_model").default("jimeng-4.5"),
    coverMode: text("cover_mode").default("text2img"),
    coverNegativePrompt: text("cover_negative_prompt").default("模糊, 变形, 低质量, 水印, 文字"),
    // Reference material fields (from reverse engineering logs)
    refMaterialId: uuid("ref_material_id"),
    refGenreCategory: text("ref_genre_category"),
    refReverseResult: jsonb("ref_reverse_result").$type<ReverseResult>(),
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

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  executions: many(taskExecutions),
}));

// ==================== Task Executions Table ====================

// Execution result JSON type
export type ExecutionResult = {
  coverUrl?: string;
  coverR2Key?: string;
  wechatMediaId?: string;
  wechatDraftId?: string;
  articleHtml?: string;
  [key: string]: unknown;
};

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
    // JSONB for input snapshot and result
    inputSnapshot: jsonb("input_snapshot"),
    result: jsonb("result").$type<ExecutionResult>(),
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

export const taskExecutionsRelations = relations(taskExecutions, ({ one }) => ({
  task: one(tasks, {
    fields: [taskExecutions.taskId],
    references: [tasks.id],
  }),
}));

// ==================== Image Prompts Table ====================

// Source enum for image prompts
export const imagePromptSourceEnum = pgEnum("image_prompt_source", [
  "manual",    // 手动创建
  "ai",        // AI 生成
  "imported",  // 导入
]);

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
  })
);

// ==================== Reverse Engineering Logs Table ====================

// Reverse result JSON types (from n8n clean_result)
export type ReverseResultMetaProfile = {
  archetype?: string;
  tone_keywords?: string[];
  target_audience?: string;
};

export type ReverseResultBlueprint = {
  section: string;
  specs: string;
};

export type ReverseResultConstraints = {
  rhythm_instruction?: string;
  vocabulary_level?: string;
  formatting_rules?: string;
};

export type ReverseResult = {
  style_name?: string;
  meta_profile?: ReverseResultMetaProfile;
  blueprint?: ReverseResultBlueprint[];
  constraints?: ReverseResultConstraints;
  execution_prompt?: string;
  [key: string]: unknown;
};

// Metrics JSON type
export type ReverseMetrics = {
  burstiness?: number;
  ttr?: number;
  avgSentLen?: number;
};

export const reverseEngineeringLogs = pgTable(
  "reverse_engineering_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    articleTitle: text("article_title"),
    articleUrl: text("article_url"),
    originalContent: text("original_content"),
    genreCategory: text("genre_category"),
    // JSONB for structured data
    reverseResult: jsonb("reverse_result").$type<ReverseResult>(),
    metrics: jsonb("metrics").$type<ReverseMetrics>(),
    // n8n writes to these columns
    reverseResultJson: jsonb("reverse_result_json"),
    metricBurstiness: real("metric_burstiness"),
    metricTtr: real("metric_ttr"),
    metricAvgSentLen: real("metric_avg_sent_len"),
    finalSystemPrompt: text("final_system_prompt"),
    modelName: text("model_name"),
    status: reverseLogStatusEnum("status").default("SUCCESS"),
    // Parsed clean result from n8n (structured reverse analysis)
    cleanResult: jsonb("clean_result").$type<ReverseResult>(),
    // Extracted fields for querying and display
    styleName: text("style_name"),
    archetype: text("archetype"),
    targetAudience: text("target_audience"),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    userIdIdx: index("idx_re_logs_user_id").on(table.userId),
    genreIdx: index("idx_re_logs_genre").on(table.genreCategory),
    createdAtIdx: index("idx_re_logs_created_at").on(table.createdAt),
    statusIdx: index("idx_re_logs_status").on(table.status),
    articleUrlIdx: index("idx_re_logs_article_url").on(table.articleUrl),
    styleNameIdx: index("idx_re_logs_style_name").on(table.styleName),
    // Composite indexes
    userCreatedIdx: index("idx_re_logs_user_created").on(
      table.userId,
      table.createdAt
    ),
    userGenreIdx: index("idx_re_logs_user_genre").on(
      table.userId,
      table.genreCategory
    ),
  })
);

export const reverseEngineeringLogsRelations = relations(
  reverseEngineeringLogs,
  ({ one }) => ({
    user: one(users, {
      fields: [reverseEngineeringLogs.userId],
      references: [users.id],
    }),
  })
);

// ==================== Type Exports ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TaskExecution = typeof taskExecutions.$inferSelect;
export type NewTaskExecution = typeof taskExecutions.$inferInsert;

export type ImagePrompt = typeof imagePrompts.$inferSelect;
export type NewImagePrompt = typeof imagePrompts.$inferInsert;

export type ReverseEngineeringLog = typeof reverseEngineeringLogs.$inferSelect;
export type NewReverseEngineeringLog = typeof reverseEngineeringLogs.$inferInsert;
