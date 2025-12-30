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
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
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
  "PENDING",
  "SUCCESS",
  "FAILED",
]);

// ==================== Users Table ====================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email").unique(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    // Legacy fields (kept for backwards compatibility)
    username: text("username"),
    accessCode: text("access_code"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    usernameIdx: uniqueIndex("idx_users_username").on(table.username),
    emailIdx: uniqueIndex("idx_users_email").on(table.email),
  })
);

// ==================== NextAuth Accounts Table ====================

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
    index("idx_accounts_user_id").on(account.userId),
  ]
);

// ==================== NextAuth Sessions Table ====================

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (session) => [
    index("idx_sessions_user_id").on(session.userId),
  ]
);

// ==================== NextAuth Verification Tokens Table ====================

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [
    primaryKey({ columns: [vt.identifier, vt.token] }),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  styleAnalyses: many(styleAnalyses),
}));

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

// Execution result JSON type (metadata only, content in separate columns)
export type ExecutionResult = {
  coverUrl?: string;
  coverR2Key?: string;
  wechatMediaId?: string;
  wechatDraftId?: string;
  [key: string]: unknown;
};

// WeChat media upload result type
export type WechatMediaInfo = {
  media_id: string;
  url: string;
  item: unknown[];
  uploaded_at?: string;
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
    // JSONB for input snapshot and result metadata
    inputSnapshot: jsonb("input_snapshot"),
    result: jsonb("result").$type<ExecutionResult>(),
    // Article content (separate columns for performance)
    articleMarkdown: text("article_markdown"),
    articleHtml: text("article_html"),
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
    // 排序优化索引 (useCount DESC, createdAt DESC)
    useCountCreatedIdx: index("idx_image_prompts_use_count_created").on(
      table.useCount,
      table.createdAt
    ),
  })
);

// ==================== Style Analyses Table (风格分析 v7.3) ====================

/**
 * StyleIdentityData - 风格身份数据
 */
export type StyleIdentityData = {
  persona_description?: string;
  voice_traits?: {
    formality?: string;
    energy?: string;
    warmth?: string;
    confidence?: string;
  };
  style_name?: string;
  archetype?: string;
  implied_reader?: string;
  [key: string]: unknown;
};

/**
 * MetricsConstraintsData - 量化约束数据
 */
export type MetricsConstraintsData = {
  avg_sentence_length?: number;
  sentence_length_std?: number;
  sentence_length_target?: number;
  avg_paragraph_length?: number;
  punctuation_rules?: Record<string, unknown>;
  rhythm_rules?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * LexicalLogicData - 词汇逻辑数据
 */
export type LexicalLogicData = {
  vocabulary_tier?: string;
  preferred_terms?: string[];
  banned_terms?: string[];
  tone_keywords?: string[];
  [key: string]: unknown;
};

/**
 * RhetoricLogicData - 修辞逻辑数据
 */
export type RhetoricLogicData = {
  preferred_devices?: string[];
  device_frequency?: Record<string, unknown>;
  sentence_templates?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

/**
 * GoldenSampleData - 黄金样本数据
 */
export type GoldenSampleData = {
  samples?: Array<{
    text?: string;
    why?: string;
  }>;
  [key: string]: unknown;
};

/**
 * TransferDemoData - 迁移示例数据
 */
export type TransferDemoData = {
  before_after_pairs?: Array<{
    before?: string;
    after?: string;
    explanation?: string;
  }>;
  [key: string]: unknown;
};

/**
 * CoreRuleItem - 核心规则条目
 */
export type CoreRuleItem = {
  rule_id?: string;
  rule_text?: string;
  importance?: string;
  examples?: string[];
  priority?: number;
  feature?: string;
  evidence?: string;
  frequency?: string;
  replication_instruction?: string;
  [key: string]: unknown;
};

/**
 * BlueprintItem - 结构蓝图条目
 */
export type BlueprintItem = {
  section?: string;
  section_position?: string;
  position?: string;
  word_count_target?: number;
  word_percentage?: string;
  function?: string;
  internal_logic?: Record<string, unknown>;
  techniques?: Array<Record<string, unknown>>;
  sentence_patterns?: Record<string, unknown>;
  do_list?: string[];
  dont_list?: string[];
  [key: string]: unknown;
};

/**
 * AntiPatternItem - 反模式条目
 */
export type AntiPatternItem = {
  pattern?: string;
  severity?: string;
  example?: string;
  fix_suggestion?: string;
  [key: string]: unknown;
};

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

    // ========== 数值指标（策略层数据，非 jsonb）==========
    metricsBurstiness: real("metrics_burstiness"), // 句长突变度 (0-1)
    metricsTtr: real("metrics_ttr"), // 词汇丰富度 TTR (0-1)

    // ========== 策略层：jsonb ==========
    styleIdentityData: jsonb("style_identity_data").$type<StyleIdentityData>(),
    metricsConstraintsData: jsonb("metrics_constraints_data").$type<MetricsConstraintsData>(),
    lexicalLogicData: jsonb("lexical_logic_data").$type<LexicalLogicData>(),
    rhetoricLogicData: jsonb("rhetoric_logic_data").$type<RhetoricLogicData>(),
    goldenSampleData: jsonb("golden_sample_data").$type<GoldenSampleData>(),
    transferDemoData: jsonb("transfer_demo_data").$type<TransferDemoData>(),

    // ========== 数组层：jsonb (各段规则 / 结构) ==========
    coreRulesData: jsonb("core_rules_data").$type<CoreRuleItem[]>(),
    blueprintData: jsonb("blueprint_data").$type<BlueprintItem[]>(),
    antiPatternsData: jsonb("anti_patterns_data").$type<AntiPatternItem[]>(),

    // ========== 备份 & 状态 ==========
    rawJsonFull: jsonb("raw_json_full"),
    metadata: jsonb("metadata"), // 解析元数据 (parse_success, parser_version, validation_*)
    status: reverseLogStatusEnum("status").default("PENDING").notNull(),
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
    // source_url 唯一索引（部分索引，仅对未删除记录生效）
    // 注意：Drizzle 不支持部分唯一索引，此处为普通索引，实际唯一约束在数据库层通过 SQL 创建
    sourceUrlIdx: index("idx_style_analyses_source_url").on(table.sourceUrl),
    // source_url 唯一约束
    sourceUrlUnique: unique("style_analyses_source_url_key").on(table.sourceUrl),
  })
);

export const styleAnalysesRelations = relations(styleAnalyses, ({ one }) => ({
  user: one(users, {
    fields: [styleAnalyses.userId],
    references: [users.id],
  }),
}));

// Backwards compatibility alias
export const reverseEngineering = styleAnalyses;

// ==================== Type Exports ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TaskExecution = typeof taskExecutions.$inferSelect;
export type NewTaskExecution = typeof taskExecutions.$inferInsert;

export type ImagePrompt = typeof imagePrompts.$inferSelect;
export type NewImagePrompt = typeof imagePrompts.$inferInsert;

export type StyleAnalysis = typeof styleAnalyses.$inferSelect;
export type NewStyleAnalysis = typeof styleAnalyses.$inferInsert;

// Backwards compatibility aliases (deprecated)
export type ReverseEngineering = StyleAnalysis;
export type NewReverseEngineering = NewStyleAnalysis;

// NextAuth types
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
