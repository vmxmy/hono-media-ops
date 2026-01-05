/**
 * 从 StyleAnalysis JSONB 字段动态生成 execution_prompt
 * 替代 LLM 单独输出，节省 token 并消除截断问题
 */

import type {
  StyleIdentityData,
  MetricsConstraintsData,
  LexicalLogicData,
  RhetoricLogicData,
  GoldenSampleData,
  CoreRuleItem,
  BlueprintItem,
  AntiPatternItem,
} from "@/server/db/schema";

export interface GenerateExecutionPromptInput {
  styleName?: string | null;
  paraCount?: number | null;
  styleIdentity?: StyleIdentityData | null;
  metricsConstraints?: MetricsConstraintsData | null;
  lexicalLogic?: LexicalLogicData | null;
  rhetoricLogic?: RhetoricLogicData | null;
  goldenSample?: GoldenSampleData | null;
  coreRules?: CoreRuleItem[] | null;
  blueprint?: BlueprintItem[] | null;
  antiPatterns?: AntiPatternItem[] | null;
}

/**
 * 生成完整的 execution_prompt
 */
export function generateExecutionPrompt(input: GenerateExecutionPromptInput): string {
  const lines: string[] = [];

  // === 角色定义 ===
  const identity = input.styleIdentity;
  const archetype = identity?.archetype ?? "风格写作者";
  const toneKeywords = identity?.tone_keywords ?? "";

  lines.push(`角色：${archetype}`);
  lines.push(`你的风格特点是：${toneKeywords}。`);
  lines.push("");

  // === 核心风格规则 ===
  const rules = input.coreRules ?? [];
  if (rules.length > 0) {
    lines.push("核心风格规则");
    for (const rule of rules) {
      lines.push(`规则 ${rule.priority} (${rule.impact})：${rule.rule}`);
      if (rule.evidence) {
        lines.push(`参考："${rule.evidence}"`);
      }
      if (rule.example) {
        lines.push(`应用："${rule.example}"`);
      }
      lines.push("");
    }
  }

  // === 写作约束 ===
  const metrics = input.metricsConstraints;
  const lexical = input.lexicalLogic;
  const rhetoric = input.rhetoricLogic;

  lines.push("写作约束 (Metrics)");
  if (metrics) {
    lines.push(`句/段长度：${metrics.target_sent_len ?? "-"} / ${metrics.target_para_len ?? "-"}`);
    if (metrics.rhythm_pattern) {
      lines.push(`节奏模式：${metrics.rhythm_pattern}`);
    }
    if (metrics.burstiness_logic) {
      lines.push(`节奏逻辑：${metrics.burstiness_logic}`);
    }
  }

  if (lexical) {
    const mustUse = Array.isArray(lexical.must_use) ? lexical.must_use.join(", ") : "";
    const mustAvoid = Array.isArray(lexical.must_avoid) ? lexical.must_avoid.join(", ") : "";
    if (mustUse || mustAvoid) {
      lines.push(`词汇偏好：必用 [${mustUse}]；避开 [${mustAvoid}]`);
    }
  }

  if (rhetoric?.dominant_device) {
    lines.push(`修辞倾向：${rhetoric.dominant_device}`);
  }
  lines.push("");

  // === 结构蓝图 ===
  const blueprint = input.blueprint ?? [];
  const paraCount = input.paraCount ?? blueprint.length;

  if (blueprint.length > 0) {
    lines.push(`结构蓝图 (严格 1:1 段落还原)`);
    lines.push(`必须生成 ${paraCount} 个段落，不得合并。`);
    lines.push("");

    // 输出关键段落摘要（首、尾、每隔 N 个）
    const keyIndices = getKeyBlueprintIndices(blueprint.length);
    for (const idx of keyIndices) {
      const item = blueprint[idx];
      if (item) {
        const pId = item.p_id ?? `${idx + 1}/${blueprint.length}`;
        lines.push(`[${pId}]：${item.strategy ?? ""}`);
        if (item.action) {
          lines.push(`核心动作：${item.action}`);
        }
        if (item.pattern_template) {
          lines.push(`模板：${item.pattern_template}`);
        }
        if (item.guidelines) {
          lines.push(`规范：${item.guidelines}`);
        }
        lines.push("");
      }
    }
  }

  // === 风格锚点 ===
  const goldenSample = input.goldenSample;
  if (goldenSample?.paragraph) {
    lines.push("风格锚点");
    lines.push(`"${goldenSample.paragraph}"`);
    lines.push("");
  }

  // === 严禁事项 ===
  const antiPatterns = input.antiPatterns ?? [];
  if (antiPatterns.length > 0) {
    lines.push("严禁事项");
    for (const item of antiPatterns) {
      lines.push(`❌ ${item.forbidden} (反面教材: ${item.bad_case})`);
    }
  }

  return lines.join("\n").trim();
}

/**
 * 获取关键蓝图索引（避免输出全部段落）
 * 策略：首段 + 每隔 5 段取一个 + 末段
 */
function getKeyBlueprintIndices(total: number): number[] {
  if (total <= 10) {
    // 段落较少时全部输出
    return Array.from({ length: total }, (_, i) => i);
  }

  const indices = new Set<number>();
  indices.add(0); // 首段
  indices.add(total - 1); // 末段

  // 每隔 5 段取一个关键点
  for (let i = 4; i < total - 1; i += 5) {
    indices.add(i);
  }

  // 确保中间段落被覆盖
  const mid = Math.floor(total / 2);
  indices.add(mid);

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * 生成简洁版 execution_prompt（用于预览）
 */
export function generateExecutionPromptPreview(input: GenerateExecutionPromptInput): string {
  const identity = input.styleIdentity;
  const archetype = identity?.archetype ?? "风格写作者";
  const toneKeywords = identity?.tone_keywords ?? "";
  const paraCount = input.paraCount ?? input.blueprint?.length ?? 0;

  return `角色：${archetype}\n风格：${toneKeywords}\n段落数：${paraCount}`;
}
