# 风格复制引擎多 Agent 架构设计

## 架构概览

将原始单一 prompt 拆分为 **7 个专门化 Agent**，通过协调器进行流程控制。

```
┌─────────────────────────────────────────────────────────────────────┐
│                        输入数据                                      │
│  (title, url, user_id, content, metrics, category, confidence)      │
└───────────────────────────┬─────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Agent 1: 协调器 (Orchestrator)                          │
│  - 接收输入，验证数据完整性                                           │
│  - 调度各专门 Agent                                                   │
│  - 汇总结果，输出最终 JSON                                            │
└───────────────────────────┬─────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Agent 2: 文本类型检测器 (Text Classifier)                │
│  - 确定文本类型 (LIT/ARG/EXP/TEC/JRN/MKT/ACA/SOC/POE)               │
│  - 输出激活模块列表                                                   │
│  - 确定分析深度 (完整/标准/精简/最小)                                  │
└───────────────────────────┬─────────────────────────────────────────┘
                            ▼
            ┌───────────────┴───────────────┐
            │        并行执行以下 Agents      │
            └───────────────┬───────────────┘
    ┌───────────┬───────────┼───────────┬───────────┐
    ▼           ▼           ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Agent 3 │ │Agent 4 │ │Agent 5 │ │Agent 6 │ │Agent 7 │
│量化分析│ │风格身份│ │核心规则│ │结构蓝图│ │修辞词汇│
└────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
     │          │          │          │          │
     └──────────┴──────────┼──────────┴──────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              协调器: 结果整合与执行提示词生成                          │
│  - 合并各 Agent 输出                                                 │
│  - 生成验证清单和反模式                                               │
│  - 输出最终 JSON + 执行提示词                                         │
└─────────────────────────────────────────────────────────────────────┘
```

## 数据流设计

### 输入数据结构（所有 Agent 共享）

```json
{
  "source": {
    "title": "{{ $json.title }}",
    "url": "{{ $json.input_content }}",
    "user_id": "{{ $json.user_id }}",
    "pre_detected_category": "{{ $json.category }}",
    "category_confidence": "{{ $json.confidence }}",
    "category_reasoning": "{{ $json.reasoning }}"
  },
  "metrics": {
    "burstiness": "{{ $json.metrics_burstiness }}",
    "ttr": "{{ $json.metrics_ttr }}",
    "avg_sent_len": "{{ $json.metrics_avg_sent_len }}",
    "avg_para_len": "{{ $json.metrics_avg_para_len }}",
    "total_words": "{{ $json.stats_total_words }}",
    "total_sentences": "{{ $json.stats_total_sentences }}",
    "total_paragraphs": "{{ $json.stats_total_paragraphs }}"
  },
  "content": "{{ $json.content_text }}"
}
```

### Agent 间数据传递

| 上游 Agent | 下游 Agent | 传递数据 |
|-----------|-----------|---------|
| 文本类型检测器 | 所有分析 Agent | `text_type`, `activated_modules`, `analysis_mode` |
| 量化分析 | 结构蓝图 | `sentence_stats`, `paragraph_stats`, `rhythm` |
| 风格身份 | 核心规则 | `archetype`, `tone_keywords` |
| 核心规则 | 结构蓝图 | `core_rules` (用于段落级验证) |

---

## Agent 职责定义

### Agent 1: 协调器 (Orchestrator)
**职责**：流程控制、数据路由、结果整合
**输入**：原始输入数据
**输出**：最终 JSON + 执行提示词

### Agent 2: 文本类型检测器 (Text Classifier)
**职责**：文本分类、模块激活决策
**输入**：content, pre_detected_category, metrics
**输出**：`meta.detected_text_type`, `meta.analysis_mode`, `meta.activated_modules`

### Agent 3: 量化分析器 (Quantitative Analyzer)
**职责**：统计特征分析
**输入**：content, metrics
**输出**：`quantitative_profile`

### Agent 4: 风格身份提取器 (Style Identity Extractor)
**职责**：人设、语气、声音特征
**输入**：content, text_type
**输出**：`style_name`, `category`, `style_identity`

### Agent 5: 核心规则提取器 (Core Rules Extractor)
**职责**：提取5条核心风格规则（最重要）
**输入**：content, text_type, style_identity
**输出**：`core_style_rules`

### Agent 6: 结构蓝图构建器 (Blueprint Constructor)
**职责**：段落结构、技巧、过渡
**输入**：content, text_type, quantitative_profile, analysis_mode
**输出**：`blueprint`, `sentence_templates`, `golden_samples`, `transformation_example`

### Agent 7: 修辞与词汇分析器 (Rhetoric & Lexical Analyzer)
**职责**：修辞手法、论证风格、词汇约束
**输入**：content, text_type, activated_modules
**输出**：`rhetoric_profile`, `lexical_constraints`, `type_specific_profile`

---

## 输出结构分配

| JSON 字段 | 负责 Agent |
|-----------|-----------|
| `meta` | 协调器 + 文本类型检测器 |
| `style_name` | 风格身份提取器 |
| `category` | 风格身份提取器 |
| `style_identity` | 风格身份提取器 |
| `core_style_rules` | 核心规则提取器 |
| `quantitative_profile` | 量化分析器 |
| `lexical_constraints` | 修辞与词汇分析器 |
| `rhetoric_profile` | 修辞与词汇分析器 |
| `type_specific_profile` | 修辞与词汇分析器 |
| `blueprint` | 结构蓝图构建器 |
| `sentence_templates` | 结构蓝图构建器 |
| `golden_samples` | 结构蓝图构建器 |
| `transformation_example` | 结构蓝图构建器 |
| `anti_patterns` | 协调器（汇总各 Agent 发现）|
| `validation_checklist` | 协调器（根据核心规则生成）|
| 执行提示词 | 协调器 |
