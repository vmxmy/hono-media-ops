# 素材模型数据分析 - 质量分析维度

## 一、字数分布分析

### 1.1 字数分布直方图
```typescript
interface WordCountDistribution {
  range: string                   // "0-1000", "1000-2000", ...
  count: number                   // 该区间的素材数量
  percentage: number              // 占比
  avgUsageCount: number           // 该区间的平均使用次数
}
```

**数据来源**：
```sql
SELECT
  CASE
    WHEN word_count < 1000 THEN '0-1000'
    WHEN word_count < 2000 THEN '1000-2000'
    WHEN word_count < 3000 THEN '2000-3000'
    WHEN word_count < 5000 THEN '3000-5000'
    WHEN word_count < 10000 THEN '5000-10000'
    ELSE '10000+'
  END as range,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage,
  AVG(use_count) as avg_usage_count
FROM style_analyses
WHERE deleted_at IS NULL
  AND user_id = $1
  AND word_count IS NOT NULL
GROUP BY range
ORDER BY MIN(word_count);
```

**展示方式**：
- 柱状图，X轴为字数区间，Y轴为素材数量
- 柱子上方显示百分比
- 鼠标悬停显示该区间的平均使用次数

**运维价值**：
- 识别素材长度分布是否合理
- 发现是否有过短或过长的异常素材
- 了解哪个长度区间的素材最受欢迎

---

### 1.2 字数统计摘要
```typescript
interface WordCountSummary {
  min: number                     // 最小字数
  max: number                     // 最大字数
  median: number                  // 中位数
  p25: number                     // 25分位数
  p75: number                     // 75分位数
  p90: number                     // 90分位数
  stdDev: number                  // 标准差
}
```

**数据来源**：
```sql
SELECT
  MIN(word_count) as min,
  MAX(word_count) as max,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY word_count) as median,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY word_count) as p25,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY word_count) as p75,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY word_count) as p90,
  STDDEV(word_count) as std_dev
FROM style_analyses
WHERE deleted_at IS NULL
  AND user_id = $1
  AND word_count IS NOT NULL;
```

**展示方式**：箱线图 (Box Plot)

**运维价值**：
- 快速识别字数分布的离散程度
- 发现异常值（outliers）
- 了解素材字数的集中趋势

---

## 二、指标分布分析

### 2.1 TTR vs Burstiness 散点图
```typescript
interface MetricsScatterPoint {
  id: string                      // 素材ID
  sourceTitle: string             // 标题
  ttr: number                     // 词汇丰富度 (X轴)
  burstiness: number              // 句长突变度 (Y轴)
  wordCount: number               // 字数 (点大小)
  primaryType: string             // 类型 (点颜色)
  useCount: number                // 使用次数
}
```

**数据来源**：
```sql
SELECT
  id,
  source_title,
  metrics_ttr as ttr,
  metrics_burstiness as burstiness,
  word_count,
  primary_type,
  use_count
FROM style_analyses
WHERE deleted_at IS NULL
  AND user_id = $1
  AND metrics_ttr IS NOT NULL
  AND metrics_burstiness IS NOT NULL
ORDER BY use_count DESC
LIMIT 100;  -- 只显示前100个，避免过于密集
```

**展示方式**：
- 散点图，X轴为TTR，Y轴为Burstiness
- 点的大小表示字数（wordCount）
- 点的颜色表示类型（primaryType）
- 鼠标悬停显示详细信息
- 可点击跳转到素材详情

**运维价值**：
- 识别高质量素材（高TTR + 适中Burstiness）
- 发现异常素材（极端值）
- 了解不同类型素材的指标分布特征
- 找到最受欢迎的素材特征

---

这是第二部分的前两个维度。接下来还有：
- 段落数分布
- 平均句长分布
- 质量评分系统

继续输出下一部分吗？
