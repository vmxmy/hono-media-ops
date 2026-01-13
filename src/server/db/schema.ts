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
  customType,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { relations } from "drizzle-orm";

// ==================== Custom Vector Type for pgvector ====================

const vector = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    // Parse "[1,2,3]" format from pgvector
    return JSON.parse(value.replace(/^\[/, "[").replace(/\]$/, "]")) as number[];
  },
});

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

export const storageProviderEnum = pgEnum("storage_provider", [
  "local",
  "r2",
  "s3",
]);

export const xhsImageTypeEnum = pgEnum("xhs_image_type", [
  "cover",    // 封面
  "content",  // 正文
  "ending",   // 结尾
]);

export const xhsJobStatusEnum = pgEnum("xhs_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
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

export const usersRelations = relations(users, ({ many, one }) => ({
  tasks: many(tasks),
  styleAnalyses: many(styleAnalyses),
  storageConfig: one(userStorageConfigs),
}));

// ==================== User Storage Configs Table ====================

export const userStorageConfigs = pgTable(
  "user_storage_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),

    // Provider type
    provider: storageProviderEnum("provider").default("local").notNull(),
    isActive: integer("is_active").default(0).notNull(), // 0=inactive, 1=active

    // Common S3-compatible fields
    bucket: text("bucket"),
    accessKeyId: text("access_key_id"),
    secretAccessKey: text("secret_access_key"), // Should be encrypted in production
    publicDomain: text("public_domain"),

    // R2 specific
    r2AccountId: text("r2_account_id"),

    // S3 specific
    s3Region: text("s3_region").default("us-east-1"),
    s3Endpoint: text("s3_endpoint"),

    // Metadata
    name: text("name"), // User-friendly name like "My R2 Storage"

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: uniqueIndex("idx_user_storage_configs_user_id").on(table.userId),
  })
);

export const userStorageConfigsRelations = relations(userStorageConfigs, ({ one }) => ({
  user: one(users, {
    fields: [userStorageConfigs.userId],
    references: [users.id],
  }),
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
  // Article processing metadata
  ready?: boolean;
  humanReview?: string[];
  transitionsAdded?: Array<{
    location: string;
    type: string;
    beforeContext: string;
    addedContent: string;
    afterContext: string;
  }>;
  modifications?: Array<{
    type: string;
    location: string;
    original: string;
    modified: string;
    reason: string;
  }>;
  statistics?: {
    wordCount?: number;
    transitionFixes?: number;
    keywordReplacements?: number;
  };
  reviewSummary?: string;
  [key: string]: unknown;
};

// WeChat media upload result type
export type WechatMediaInfoItem = {
  act_number?: number;
  act_name?: string | null;
  media_id?: string;
  wechat_media_url?: string;  // 微信素材 CDN 地址
  r2_url?: string;            // Cloudflare R2 素材地址
  item?: unknown[];
  uploaded_at?: string;
};

export type WechatMediaInfo = WechatMediaInfoItem | WechatMediaInfoItem[];

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

export const taskExecutionsRelations = relations(taskExecutions, ({ one }) => ({
  task: one(tasks, {
    fields: [taskExecutions.taskId],
    references: [tasks.id],
  }),
  blueprint: one(taskBlueprints),
}));

// ==================== Task Blueprints Table (写作蓝图) ====================

/**
 * 作者身份配置
 */
export type BlueprintIdentity = {
  archetype: string;           // 作者人格原型，如 "文化评论家/深度观察者"
  personaDesc: string;         // 人格描述
  toneKeywords: string;        // 语调关键词，如 "感性, 犀利, 哀而不伤"
  energyLevel: string;         // 能量级别，如 "由疾促到舒缓"
  voiceDistance: string;       // 叙事距离，如 "中等（冷静剖析与心理代入交替）"
  formalityScore: number;      // 正式度评分 (1-10)
};

/**
 * 风格约束配置
 */
export type BlueprintStyleConfig = {
  rhythm: string;              // 节奏模式
  argStyle: string;            // 论证风格
  dominantDevice: string;      // 主要修辞手法
  punctuation: string;         // 标点风格
  mustUse: string[];           // 必须使用的关键词
  mustAvoid: string[];         // 必须避免的词汇
  universalConstraints: string[]; // 通用约束
  signature?: string;          // 签名
};

/**
 * 章节/幕结构
 */
export type BlueprintAct = {
  actNumber: number;
  name: string;
  openingHook: string;         // 开场钩子
  closingBridge: string;       // 收尾过渡
  goal: string;
  actQuestion: string;         // 本幕提问
  actDeliverable: string;      // 本幕交付物
};

/**
 * 段落详情
 */
export type BlueprintParagraph = {
  pId: string;                 // 段落ID，如 "1/24"
  act: number;                 // 所属幕
  heading: string;             // 标题
  paragraphType: string;       // 段落类型，如 "anchor_scene", "expansion_detail"
  paragraphFunction: string;   // 段落功能，如 "anchor", "evidence", "transition"
  mustEstablish: string;       // 必须建立的内容
  localKeywords: string[];     // 本地关键词
  microTakeaway: string | null; // 小结/金句
  wordWeight: number;          // 字数权重 (1-5)
  stylisticRule: string;       // 风格规则
  dependsOn: string[];         // 依赖的段落ID
  dependsOnReason: string;     // 依赖原因
};

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

export const taskBlueprintsRelations = relations(taskBlueprints, ({ one, many }) => ({
  execution: one(taskExecutions, {
    fields: [taskBlueprints.executionId],
    references: [taskExecutions.id],
  }),
  chapters: many(chapterOutputs),
}));

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

export const chapterOutputsRelations = relations(chapterOutputs, ({ one }) => ({
  blueprint: one(taskBlueprints, {
    fields: [chapterOutputs.blueprintId],
    references: [taskBlueprints.id],
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

// ==================== Style Analyses Table (风格分析 v8.0) ====================

/**
 * StyleIdentityData - 风格身份数据
 * 适配 n8n 工作流输入格式 v8.0
 */
export type StyleIdentityData = {
  // v8.0 核心字段
  archetype?: string; // 作者人格原型，如 "洞察世情的闺蜜史官"
  tone_keywords?: string; // 语调关键词，如 "唏嘘, 际遇, 刚强"
  voice_distance?: string; // 叙事视角距离，如 "半全知视角"

  // 兼容旧版字段
  persona_description?: string;
  voice_traits?: {
    formality?: string;
    energy?: string;
    warmth?: string;
    confidence?: string;
  };
  style_name?: string;
  implied_reader?: string;
  [key: string]: unknown;
};

/**
 * MetricsConstraintsData - 量化约束数据
 * 适配 n8n 工作流输入格式 v8.0
 */
export type MetricsConstraintsData = {
  // v8.0 核心字段
  rhythm_pattern?: string; // 节奏模式，如 "长叙述铺陈 + 短金句定调"
  punctuation_logic?: string; // 标点逻辑，如 "高频使用破折号表解释"

  // 兼容旧版字段
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
 * 适配 n8n 工作流输入格式 v8.0
 */
export type LexicalLogicData = {
  // v8.0 核心字段
  must_use?: string[]; // 必须使用的词汇，如 ["众口一词", "恍若", "际遇"]
  verb_style?: string; // 动词风格，如 "具有画面感和力度的动词"
  adj_style?: string; // 形容词风格，如 "叠加式古风修辞与现代犀利评价并存"

  // 兼容旧版字段
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
 * 适配 n8n 工作流输入格式 v8.0
 */
export type GoldenSampleData = {
  // v8.0 核心字段（单对象格式）
  paragraph?: string; // 黄金样本段落全文
  reason?: string; // 选择该样本的原因

  // 兼容旧版字段（数组格式）
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
 * 适配 n8n 工作流输入格式 v8.0
 */
export type CoreRuleItem = {
  // v8.0 核心字段
  priority?: number; // 规则优先级，如 1, 2, 3
  rule?: string; // 规则名称，如 "视觉锚点叙事法"
  evidence?: string; // 规则证据，如 "▲ 15日，何晴告别仪式..."
  example?: string; // 规则示例说明

  // 兼容旧版字段
  rule_id?: string;
  rule_text?: string;
  importance?: string;
  examples?: string[];
  feature?: string;
  frequency?: string;
  replication_instruction?: string;
  [key: string]: unknown;
};

/**
 * BlueprintItem - 结构蓝图条目
 * 适配 n8n 工作流输入格式 v8.0
 */
export type BlueprintItem = {
  // v8.0 核心字段
  p_id?: string; // 段落ID，如 "1", "2"
  strategy?: string; // 段落策略，如 "怀旧切入与悬念铺垫"
  action?: string; // 具体行动描述
  word_count_target?: string | number; // 目标字数，如 "150 ± 20" 或 150
  techniques?: string[]; // 写作技巧列表，如 ["侧面烘托", "引入热点"]
  pattern_template?: string; // 模式模板，如 "泛指怀旧 -> 特指人物 -> ..."
  pattern_sample?: string; // 模式样本，具体示例文本

  // 兼容旧版字段
  section?: string;
  section_position?: string;
  position?: string;
  word_percentage?: string;
  function?: string;
  internal_logic?: Record<string, unknown>;
  sentence_patterns?: Record<string, unknown>;
  do_list?: string[];
  dont_list?: string[];
  [key: string]: unknown;
};

/**
 * AntiPatternItem - 反模式条目
 * 适配 n8n 工作流输入格式 v8.0
 */
export type AntiPatternItem = {
  // v8.0 核心字段
  forbidden?: string; // 禁止的模式，如 "教科书式的生平流水账"
  fix_suggestion?: string; // 修复建议

  // 兼容旧版字段
  pattern?: string;
  severity?: string;
  example?: string;
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

// ==================== Article Embeddings Table (向量搜索) ====================

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

export const articleEmbeddingsRelations = relations(articleEmbeddings, ({ one }) => ({
  execution: one(taskExecutions, {
    fields: [articleEmbeddings.executionId],
    references: [taskExecutions.id],
  }),
  task: one(tasks, {
    fields: [articleEmbeddings.taskId],
    references: [tasks.id],
  }),
}));

// ==================== Xiaohongshu Image Jobs Table (小红书图片生成任务) ====================

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

export const xhsImageJobsRelations = relations(xhsImageJobs, ({ one, many }) => ({
  user: one(users, {
    fields: [xhsImageJobs.userId],
    references: [users.id],
  }),
  images: many(xhsImages),
}));

// ==================== Xiaohongshu Images Table (小红书图片详情) ====================

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

export const xhsImagesRelations = relations(xhsImages, ({ one }) => ({
  job: one(xhsImageJobs, {
    fields: [xhsImages.jobId],
    references: [xhsImageJobs.id],
  }),
}));

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

export type TaskBlueprint = typeof taskBlueprints.$inferSelect;
export type NewTaskBlueprint = typeof taskBlueprints.$inferInsert;

export type ChapterOutput = typeof chapterOutputs.$inferSelect;
export type NewChapterOutput = typeof chapterOutputs.$inferInsert;

export type ArticleEmbedding = typeof articleEmbeddings.$inferSelect;
export type NewArticleEmbedding = typeof articleEmbeddings.$inferInsert;

export type XhsImageJob = typeof xhsImageJobs.$inferSelect;
export type NewXhsImageJob = typeof xhsImageJobs.$inferInsert;

export type XhsImage = typeof xhsImages.$inferSelect;
export type NewXhsImage = typeof xhsImages.$inferInsert;

export type UserStorageConfig = typeof userStorageConfigs.$inferSelect;
export type NewUserStorageConfig = typeof userStorageConfigs.$inferInsert;

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
