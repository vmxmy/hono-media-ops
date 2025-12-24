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

// Cover config JSON type
export type CoverConfig = {
  prompt?: string;
  ratio?: string;
  resolution?: string;
  model?: string;
  mode?: string;
  negativePrompt?: string;
};

// Article config JSON type
export type ArticleConfig = {
  style?: string;
  openingExample?: string;
  structureGuide?: string;
  outputSchema?: string;
};

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    topic: text("topic").notNull(),
    keywords: text("keywords"),
    templateId: text("template_id"),
    refUrl: text("ref_url"),
    status: taskStatusEnum("status").default("pending").notNull(),
    resultTitle: text("result_title"),
    resultContent: text("result_content"),
    // JSONB for structured config
    articleConfig: jsonb("article_config").$type<ArticleConfig>(),
    coverConfig: jsonb("cover_config").$type<CoverConfig>().default({
      ratio: "16:9",
      resolution: "1k",
      model: "jimeng-4.5",
      mode: "text2img",
      negativePrompt: "模糊, 变形, 低质量, 水印, 文字",
    }),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    userIdIdx: index("idx_tasks_user_id").on(table.userId),
    statusIdx: index("idx_tasks_status").on(table.status),
    createdAtIdx: index("idx_tasks_created_at").on(table.createdAt),
    // Composite index for common queries
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

// ==================== Prompts Table ====================

export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    content: text("content").notNull(),
    category: text("category").default("default"),
    description: text("description"),
    // Metadata as JSONB for extensibility
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    categoryIdx: index("idx_prompts_category").on(table.category),
    nameIdx: index("idx_prompts_name").on(table.name),
    // Composite index for category listing
    categoryNameIdx: index("idx_prompts_category_name").on(
      table.category,
      table.name
    ),
  })
);

// ==================== Wechat Articles Table ====================

// Article images JSON type
export type ArticleImages = {
  urls: string[];
  count: number;
};

export const wechatArticles = pgTable(
  "wechat_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull().unique(),
    title: text("title").notNull(),
    author: text("author"),
    nickname: text("nickname"),
    createTime: timestamp("create_time"),
    contentHtml: text("content_html"),
    contentText: text("content_text"),
    // JSONB for images array
    images: jsonb("images").$type<ArticleImages>(),
    articleLink: text("article_link"),
    publicMainLink: text("public_main_link"),
    // Timestamps
    crawledAt: timestamp("crawled_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    urlIdx: uniqueIndex("idx_wechat_articles_url").on(table.url),
    nicknameIdx: index("idx_wechat_articles_nickname").on(table.nickname),
    createTimeIdx: index("idx_wechat_articles_create_time").on(table.createTime),
    // Composite index for listing by account
    nicknameTimeIdx: index("idx_wechat_articles_nickname_time").on(
      table.nickname,
      table.createTime
    ),
  })
);

// ==================== Reverse Engineering Logs Table ====================

// Reverse result JSON type
export type ReverseResult = {
  genre?: string;
  tone?: string;
  structure?: string;
  vocabulary?: string[];
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
    // Raw data - stores the complete n8n response before parsing
    rawData: jsonb("raw_data"),
    // JSONB for structured data (parsed from rawData)
    reverseResult: jsonb("reverse_result").$type<ReverseResult>(),
    metrics: jsonb("metrics").$type<ReverseMetrics>(),
    // Legacy columns - n8n writes here, service converts to JSONB
    reverseResultJson: jsonb("reverse_result_json"),
    metricBurstiness: real("metric_burstiness"),
    metricTtr: real("metric_ttr"),
    metricAvgSentLen: real("metric_avg_sent_len"),
    finalSystemPrompt: text("final_system_prompt"),
    // Model info
    modelName: text("model_name"),
    totalTokens: integer("total_tokens"),
    costEstimatedUsd: real("cost_estimated_usd"),
    n8nExecutionId: text("n8n_execution_id"),
    status: reverseLogStatusEnum("status").default("SUCCESS"),
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

export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;

export type WechatArticle = typeof wechatArticles.$inferSelect;
export type NewWechatArticle = typeof wechatArticles.$inferInsert;

export type ReverseEngineeringLog = typeof reverseEngineeringLogs.$inferSelect;
export type NewReverseEngineeringLog = typeof reverseEngineeringLogs.$inferInsert;
