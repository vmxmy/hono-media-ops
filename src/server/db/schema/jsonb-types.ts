/**
 * JSONB Type Definitions
 * Shared types for JSONB columns across tables
 */

// ==================== Task Execution Types ====================

/** Execution result JSON type (metadata only, content in separate columns) */
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

/** WeChat media upload result type */
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

// ==================== Task Blueprint Types ====================

/** 作者身份配置 */
export type BlueprintIdentity = {
  archetype: string;           // 作者人格原型，如 "文化评论家/深度观察者"
  personaDesc: string;         // 人格描述
  toneKeywords: string;        // 语调关键词，如 "感性, 犀利, 哀而不伤"
  energyLevel: string;         // 能量级别，如 "由疾促到舒缓"
  voiceDistance: string;       // 叙事距离，如 "中等（冷静剖析与心理代入交替）"
  formalityScore: number;      // 正式度评分 (1-10)
};

/** 风格约束配置 */
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

/** 章节/幕结构 */
export type BlueprintAct = {
  actNumber: number;
  name: string;
  openingHook: string;         // 开场钩子
  closingBridge: string;       // 收尾过渡
  goal: string;
  actQuestion: string;         // 本幕提问
  actDeliverable: string;      // 本幕交付物
};

/** 段落详情 */
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

// ==================== Style Analysis Types ====================

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
