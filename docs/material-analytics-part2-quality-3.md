# 素材模型数据分析 - 质量评分系统

## 五、质量评分系统

### 5.1 评分维度设计
```typescript
interface QualityScore {
  materialId: string
  totalScore: number              // 总分 (0-100)

  // 各维度得分
  contentScore: number            // 内容质量 (0-25)
  structureScore: number          // 结构质量 (0-25)
  metricsScore: number            // 指标质量 (0-25)
  usageScore: number              // 使用价值 (0-25)

  // 评级
  grade: 'S' | 'A' | 'B' | 'C' | 'D'

  // 问题标记
  issues: string[]                // 质量问题列表
}
```

**评分维度说明**：

1. **内容质量 (25分)**
   - 字数合理性 (10分)：2000-5000字为最佳
   - 段落数合理性 (10分)：5-20段为最佳
   - 完整性 (5分)：是否有标题、类型等元数据

2. **结构质量 (25分)**
   - 段落密度 (10分)：每段200-500字为最佳
   - 句长合理性 (10分)：平均句长30-60字为最佳
   - 结构化程度 (5分)：是否有blueprint等结构数据

3. **指标质量 (25分)**
   - TTR得分 (10分)：0.5-0.7为最佳
   - Burstiness得分 (10分)：10-20为最佳
   - 指标完整性 (5分)：是否有完整的指标数据

4. **使用价值 (25分)**
   - 使用频率 (15分)：使用次数越多得分越高
   - 时效性 (10分)：最近使用过的得分更高

---

### 5.2 评分算法
```typescript
function calculateQualityScore(material: StyleAnalysis): QualityScore {
  // 1. 内容质量得分
  const contentScore =
    calculateWordCountScore(material.wordCount) +      // 10分
    calculateParaCountScore(material.paraCount) +      // 10分
    calculateCompletenessScore(material);              // 5分

  // 2. 结构质量得分
  const structureScore =
    calculateParaDensityScore(material) +              // 10分
    calculateSentLenScore(material.metricsAvgSentLen) + // 10分
    calculateStructureDataScore(material);             // 5分

  // 3. 指标质量得分
  const metricsScore =
    calculateTtrScore(material.metricsTtr) +           // 10分
    calculateBurstinessScore(material.metricsBurstiness) + // 10分
    calculateMetricsCompletenessScore(material);       // 5分

  // 4. 使用价值得分
  const usageScore =
    calculateUsageFrequencyScore(material.useCount) +  // 15分
    calculateRecencyScore(material.lastUsedAt);        // 10分

  const totalScore = contentScore + structureScore + metricsScore + usageScore;

  return {
    materialId: material.id,
    totalScore,
    contentScore,
    structureScore,
    metricsScore,
    usageScore,
    grade: calculateGrade(totalScore),
    issues: detectIssues(material),
  };
}
```

---

这是质量评分系统的基本设计。接下来我需要输出：
- 具体的评分函数实现
- 评级标准
- 问题检测规则
- 展示方式

继续输出吗？
