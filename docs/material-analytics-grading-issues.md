# 质量评分系统 - 评级标准与问题检测

## 一、评级标准

### 1.1 等级划分
```typescript
function calculateGrade(totalScore: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (totalScore >= 90) return 'S';  // 优秀
  if (totalScore >= 75) return 'A';  // 良好
  if (totalScore >= 60) return 'B';  // 中等
  if (totalScore >= 45) return 'C';  // 及格
  return 'D';                        // 不及格
}
```

### 1.2 等级说明
| 等级 | 分数范围 | 说明 | 颜色 |
|------|---------|------|------|
| S | 90-100 | 优秀素材，各项指标均衡，使用频繁 | 金色 #fbbf24 |
| A | 75-89 | 良好素材，大部分指标优秀 | 绿色 #22c55e |
| B | 60-74 | 中等素材，指标基本合格 | 蓝色 #3b82f6 |
| C | 45-59 | 及格素材，存在一些问题 | 橙色 #f59e0b |
| D | 0-44 | 不及格素材，需要改进或淘汰 | 红色 #ef4444 |

### 1.3 等级分布统计
```typescript
interface GradeDistribution {
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  count: number
  percentage: number
  avgScore: number
}
```

**展示方式**：
- 柱状图显示各等级的素材数量
- 饼图显示各等级的占比
- 帮助识别素材库的整体质量水平

---

## 二、问题检测规则

### 2.1 问题类型定义
```typescript
type IssueType =
  | 'word_count_too_short'      // 字数过少
  | 'word_count_too_long'       // 字数过多
  | 'para_count_too_few'        // 段落过少
  | 'para_count_too_many'       // 段落过多
  | 'para_too_dense'            // 段落过密
  | 'para_too_sparse'           // 段落过疏
  | 'sent_too_short'            // 句子过短
  | 'sent_too_long'             // 句子过长
  | 'ttr_too_low'               // 词汇丰富度过低
  | 'ttr_too_high'              // 词汇丰富度过高
  | 'burstiness_too_low'        // 突变度过低
  | 'burstiness_too_high'       // 突变度过高
  | 'never_used'                // 从未使用
  | 'long_time_unused'          // 长期未使用
  | 'missing_metadata'          // 缺少元数据
  | 'missing_metrics'           // 缺少指标
  | 'parse_failed';             // 解析失败

interface Issue {
  type: IssueType
  severity: 'critical' | 'warning' | 'info'
  message: string
  suggestion?: string
}
```

### 2.2 问题检测函数
```typescript
function detectIssues(material: StyleAnalysis): Issue[] {
  const issues: Issue[] = [];

  // 1. 字数问题
  if (material.wordCount !== null) {
    if (material.wordCount < 500) {
      issues.push({
        type: 'word_count_too_short',
        severity: 'warning',
        message: `字数过少 (${material.wordCount}字)`,
        suggestion: '建议补充内容至2000字以上'
      });
    } else if (material.wordCount > 10000) {
      issues.push({
        type: 'word_count_too_long',
        severity: 'warning',
        message: `字数过多 (${material.wordCount}字)`,
        suggestion: '建议拆分为多个素材'
      });
    }
  }

  // 2. 段落问题
  if (material.paraCount !== null) {
    if (material.paraCount < 3) {
      issues.push({
        type: 'para_count_too_few',
        severity: 'warning',
        message: `段落过少 (${material.paraCount}段)`,
        suggestion: '建议增加段落划分，提高可读性'
      });
    } else if (material.paraCount > 50) {
      issues.push({
        type: 'para_count_too_many',
        severity: 'info',
        message: `段落过多 (${material.paraCount}段)`,
        suggestion: '考虑合并部分段落'
      });
    }
  }

  // 3. 段落密度问题
  if (material.wordCount && material.paraCount && material.paraCount > 0) {
    const avgWordPerPara = material.wordCount / material.paraCount;
    if (avgWordPerPara < 50) {
      issues.push({
        type: 'para_too_sparse',
        severity: 'info',
        message: `段落过疏 (平均${avgWordPerPara.toFixed(0)}字/段)`,
        suggestion: '考虑合并短段落'
      });
    } else if (avgWordPerPara > 1000) {
      issues.push({
        type: 'para_too_dense',
        severity: 'warning',
        message: `段落过密 (平均${avgWordPerPara.toFixed(0)}字/段)`,
        suggestion: '建议拆分长段落'
      });
    }
  }

  // 4. 句长问题
  if (material.metricsAvgSentLen !== null) {
    if (material.metricsAvgSentLen < 10) {
      issues.push({
        type: 'sent_too_short',
        severity: 'info',
        message: `句子过短 (平均${material.metricsAvgSentLen.toFixed(0)}字)`,
        suggestion: '可能影响表达完整性'
      });
    } else if (material.metricsAvgSentLen > 100) {
      issues.push({
        type: 'sent_too_long',
        severity: 'warning',
        message: `句子过长 (平均${material.metricsAvgSentLen.toFixed(0)}字)`,
        suggestion: '建议拆分长句，提高可读性'
      });
    }
  }

  // 5. TTR问题
  if (material.metricsTtr !== null) {
    if (material.metricsTtr < 0.3) {
      issues.push({
        type: 'ttr_too_low',
        severity: 'warning',
        message: `词汇丰富度过低 (TTR=${material.metricsTtr.toFixed(2)})`,
        suggestion: '建议增加词汇多样性'
      });
    } else if (material.metricsTtr > 0.9) {
      issues.push({
        type: 'ttr_too_high',
        severity: 'info',
        message: `词汇丰富度异常高 (TTR=${material.metricsTtr.toFixed(2)})`,
        suggestion: '可能存在数据异常'
      });
    }
  }

  // 6. Burstiness问题
  if (material.metricsBurstiness !== null) {
    if (material.metricsBurstiness < 2) {
      issues.push({
        type: 'burstiness_too_low',
        severity: 'info',
        message: `突变度过低 (${material.metricsBurstiness.toFixed(1)})`,
        suggestion: '句长过于均匀，可能缺乏节奏感'
      });
    } else if (material.metricsBurstiness > 30) {
      issues.push({
        type: 'burstiness_too_high',
        severity: 'warning',
        message: `突变度过高 (${material.metricsBurstiness.toFixed(1)})`,
        suggestion: '句长变化过大，可能影响阅读体验'
      });
    }
  }

  // 7. 使用情况问题
  if (material.useCount === 0) {
    issues.push({
      type: 'never_used',
      severity: 'info',
      message: '从未被使用',
      suggestion: '考虑测试使用或删除'
    });
  }

  // 8. 时效性问题
  // 需要传入 lastUsedAt，这里假设已经计算
  // if (lastUsedAt && daysSinceLastUse > 180) { ... }

  // 9. 元数据完整性
  const missingFields: string[] = [];
  if (!material.sourceTitle) missingFields.push('标题');
  if (!material.styleName) missingFields.push('风格名称');
  if (!material.primaryType) missingFields.push('类型');

  if (missingFields.length > 0) {
    issues.push({
      type: 'missing_metadata',
      severity: 'warning',
      message: `缺少元数据: ${missingFields.join('、')}`,
      suggestion: '建议补充完整元数据'
    });
  }

  // 10. 指标完整性
  const missingMetrics: string[] = [];
  if (material.metricsTtr === null) missingMetrics.push('TTR');
  if (material.metricsBurstiness === null) missingMetrics.push('Burstiness');
  if (material.metricsAvgSentLen === null) missingMetrics.push('平均句长');

  if (missingMetrics.length > 0) {
    issues.push({
      type: 'missing_metrics',
      severity: 'warning',
      message: `缺少指标: ${missingMetrics.join('、')}`,
      suggestion: '建议重新分析以获取完整指标'
    });
  }

  // 11. 解析状态
  if (material.status === 'FAILED') {
    issues.push({
      type: 'parse_failed',
      severity: 'critical',
      message: '解析失败',
      suggestion: '需要重新分析或检查源内容'
    });
  }

  return issues;
}
```

---

这是评级标准和问题检测规则。最后还需要输出展示方式。

继续吗？
