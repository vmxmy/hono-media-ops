# 素材模型数据分析 - 分类分析维度

## 一、类型分布分析

### 1.1 类型分布统计
```typescript
interface TypeDistribution {
  type: string                    // narrative, tutorial, opinion, etc.
  count: number                   // 该类型的素材数量
  percentage: number              // 占比

  // 质量指标
  avgWordCount: number            // 平均字数
  avgParaCount: number            // 平均段落数
  avgBurstiness: number           // 平均突变度
  avgTtr: number                  // 平均TTR
  avgSentLen: number              // 平均句长

  // 使用情况
  avgUsageCount: number           // 平均使用次数
  totalUsageCount: number         // 总使用次数
  usageRate: number               // 使用率 (%)

  // 质量评分
  avgQualityScore: number         // 平均质量分
  gradeDistribution: {            // 等级分布
    S: number
    A: number
    B: number
    C: number
    D: number
  }
}
```

**数据来源**：
```sql
SELECT
  primary_type as type,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage,

  AVG(word_count) as avg_word_count,
  AVG(para_count) as avg_para_count,
  AVG(metrics_burstiness) as avg_burstiness,
  AVG(metrics_ttr) as avg_ttr,
  AVG(metrics_avg_sent_len) as avg_sent_len,

  AVG(use_count) as avg_usage_count,
  SUM(use_count) as total_usage_count,
  COUNT(*) FILTER (WHERE use_count > 0) * 100.0 / COUNT(*) as usage_rate

FROM style_analyses
WHERE deleted_at IS NULL
  AND user_id = $1
  AND primary_type IS NOT NULL
GROUP BY primary_type
ORDER BY count DESC;
```

**展示方式**：
- 柱状图：X轴为类型，Y轴为数量
- 表格：显示详细的统计数据
- 饼图：显示类型占比

---

### 1.2 类型排行榜
```typescript
interface TypeRanking {
  rank: number
  type: string
  count: number
  percentage: number
  trend: 'up' | 'down' | 'stable'  // 相比上月的趋势
  trendValue: number                // 变化百分比
}
```

**展示方式**：
- 排行榜列表，显示前10个类型
- 带趋势箭头和变化百分比

---

## 二、类型对比分析

### 2.1 类型雷达图对比
```typescript
interface TypeRadarComparison {
  type: string
  dimensions: {
    wordCount: number       // 归一化到0-100
    paraCount: number       // 归一化到0-100
    burstiness: number      // 归一化到0-100
    ttr: number            // 归一化到0-100
    usageCount: number     // 归一化到0-100
  }
}
```

**数据处理**：
```typescript
// 归一化函数：将各指标映射到0-100区间
function normalizeMetrics(types: TypeDistribution[]): TypeRadarComparison[] {
  const maxWordCount = Math.max(...types.map(t => t.avgWordCount));
  const maxParaCount = Math.max(...types.map(t => t.avgParaCount));
  const maxUsageCount = Math.max(...types.map(t => t.avgUsageCount));

  return types.map(type => ({
    type: type.type,
    dimensions: {
      wordCount: (type.avgWordCount / maxWordCount) * 100,
      paraCount: (type.avgParaCount / maxParaCount) * 100,
      burstiness: Math.min((type.avgBurstiness / 25) * 100, 100),
      ttr: type.avgTtr * 100,
      usageCount: (type.avgUsageCount / maxUsageCount) * 100
    }
  }));
}
```

**展示方式**：
- 多系列雷达图，每个类型一条线
- 最多显示5个主要类型
- 可交互选择要对比的类型

---

这是第三部分的前两个维度。接下来还有：
- 类型趋势分析
- 类型与质量的关系

继续输出吗？
