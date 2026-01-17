/**
 * Style Analysis Types
 * 风格分析相关的 JSONB 类型定义
 *
 * 这些类型用于前端组件，定义了 JSONB 数据的完整结构
 * 兼容 v7.0 - v8.0 的数据格式
 */

/**
 * StyleIdentityData - 风格身份数据
 */
export interface StyleIdentityData {
  // v8.0 核心字段
  archetype?: string;
  tone_keywords?: string;
  voice_distance?: string;

  // 兼容旧版字段
  persona_description?: string;
  persona_desc?: string;
  voice_traits?: {
    formality?: string;
    energy?: string;
    warmth?: string;
    confidence?: string;
  };
  style_name?: string;
  implied_reader?: string;
  energy_level?: string;
  formality_score?: string;
}

/**
 * MetricsConstraintsData - 量化约束数据
 */
export interface MetricsConstraintsData {
  // v8.0 核心字段
  rhythm_pattern?: string;
  punctuation_logic?: string;

  // 兼容旧版字段
  avg_sentence_length?: number;
  sentence_length_std?: number;
  sentence_length_target?: number;
  avg_paragraph_length?: number;
  punctuation_rules?: Record<string, unknown>;
  rhythm_rules?: Record<string, unknown>;
}

/**
 * LexicalLogicData - 词汇逻辑数据
 */
export interface LexicalLogicData {
  // v8.0 核心字段
  must_use?: string[];
  verb_style?: string;
  adj_style?: string;

  // 兼容旧版字段
  vocabulary_tier?: string;
  preferred_terms?: string[];
  banned_terms?: string[];
  tone_keywords?: string[];
  must_avoid?: string[];
}

/**
 * RhetoricLogicData - 修辞逻辑数据
 */
export interface RhetoricLogicData {
  preferred_devices?: string[];
  device_frequency?: Record<string, unknown>;
  sentence_templates?: Array<Record<string, unknown>>;
  dominant_device?: string;
  opening_pattern?: string;
  closing_pattern?: string;
  arg_style?: string;
  device_sample?: string;
}

/**
 * GoldenSampleData - 黄金样本数据
 */
export interface GoldenSampleData {
  // v8.0 核心字段（单对象格式）
  paragraph?: string;
  reason?: string;
  tech_list?: string[];

  // 兼容旧版字段（数组格式）
  samples?: Array<{
    text?: string;
    why?: string;
  }>;
}

/**
 * TransferDemoData - 迁移示例数据
 */
export interface TransferDemoData {
  before_after_pairs?: Array<{
    before?: string;
    after?: string;
    explanation?: string;
  }>;
  new_text?: string;
  new_topic?: string;
  preserved_elements?: string;
}

/**
 * BlueprintItem - 结构蓝图条目
 */
export interface BlueprintItem {
  // v8.0 核心字段
  p_id?: string;
  strategy?: string;
  action?: string;
  word_count_target?: string | number;
  techniques?: string[] | Array<{ name?: string; technique?: string }>;
  pattern_template?: string;
  pattern_sample?: string;
  guidelines?: string;

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
}

/**
 * CoreRuleItem - 核心规则条目
 */
export interface CoreRuleItem {
  // v8.0 核心字段
  priority?: number;
  rule?: string;
  evidence?: string;
  example?: string;

  // 兼容旧版字段
  rule_id?: string;
  rule_text?: string;
  importance?: string;
  examples?: string[];
  feature?: string;
  impact?: string;
  test_method?: string;
  frequency?: string;
  replication_instruction?: string;
}

/**
 * AntiPatternItem - 反模式条目
 */
export interface AntiPatternItem {
  // v8.0 核心字段
  forbidden?: string;
  fix_suggestion?: string;

  // 兼容旧版字段
  pattern?: string;
  severity?: string;
  example?: string;
  bad_case?: string;
}

/**
 * StyleAnalysisMaterial - 风格分析素材的完整类型
 * 用于 MaterialCard 展示
 */
export interface StyleAnalysisMaterial {
  id: string;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  styleName?: string | null;
  primaryType?: string | null;
  analysisVersion?: string | null;
  wordCount?: number | null;
  paraCount?: number | null;
  metricsBurstiness?: number | null;
  metricsTtr?: number | null;
  metricsAvgSentLen?: number | null;
  useCount?: number | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}
