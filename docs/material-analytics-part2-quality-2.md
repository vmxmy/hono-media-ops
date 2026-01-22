# 素材模型数据分析 - 质量分析维度（续）

## 三、段落数分布分析

### 3.1 段落数分布柱状图
```typescript
interface ParagraphDistribution {
  paraCount: number               // 段落数
  materialCount: number           // 素材数量
  percentage: number              // 占比
  avgWordCount: number            // 该段落数的平均字数
  avgUsageCount: number           // 该段落数的平均使用次数
}
```

**数据来源**：
```sql
SELECT
  para_count,
  COUNT(*) as material_count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage,
  AVG(word_count) as avg_word_count,
  AVG(use_count) as avg_usage_count
FROM style_analyses
WHERE deleted_at IS NULL
  AND user_id = $1
  AND para_count IS NOT NULL
GROUP BY para_count
ORDER BY para_count;
```

**展示方式**：
- 柱状图，X轴为段落数，Y轴为素材数量
- 颜色渐变：段落数越多颜色越深
- 鼠标悬停显示该段落数的平均字数和使用次数

**运维价值**：
- 识别素材的结构化程度
- 了解用户偏好的段落数范围
- 发现结构异常的素材（段落过少或过多）

---

### 3.2 段落数与字数关系
```typescript
interface ParaWordRelation {
  paraCount: number
  avgWordCount: number
  avgWordPerPara: number          // 平均每段字数
  materialCount: number
}
```

**数据来源**：
```sql
SELECT
  para_count,
  AVG(word_count) as avg_word_count,
  AVG(word_count::float / NULLIF(para_count, 0)) as avg_word_per_para,
  COUNT(*) as material_count
FROM style_analyses
WHERE deleted_at IS NULL
  AND user_id = $1
  AND para_count > 0
  AND word_count IS NOT NULL
GROUP BY para_count
ORDER BY para_count;
```

**展示方式**：
- 双Y轴折线图
- 左Y轴：平均总字数
- 右Y轴：平均每段字数
- X轴：段落数

**运维价值**：
- 识别段落密度（每段字数）的分布
- 发现段落过长或过短的素材
- 了解不同段落数素材的写作风格

---

## 四、平均句长分布分析

### 4.1 平均句长分布直方图
```typescript
interface AvgSentLenDistribution {
  range: string                   // "0-20", "20-40", ...
  count: number
  percentage: number
  avgBurstiness: number           // 该区间的平均突变度
}
```

**数据来源**：
```sql
SELECT
  CASE
    WHEN metrics_avg_sent_len < 20 THEN '0-20'
    WHEN metrics_avg_sent_len < 40 THEN '20-40'
    WHEN metrics_avg_sent_len < 60 THEN '40-60'
    WHEN metrics_avg_sent_len < 80 THEN '60-80'
    ELSE '80+'
  END as range,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage,
  AVG(metrics_burstiness) as avg_burstiness
FROM style_analyses
WHERE deleted_at IS NULL
  AND user_id = $1
  AND metrics_avg_sent_len IS NOT NULL
GROUP BY range
ORDER BY MIN(metrics_avg_sent_len);
```

**展示方式**：
- 柱状图，X轴为句长区间，Y轴为素材数量
- 柱子颜色表示该区间的平均突变度（渐变色）

**运维价值**：
- 识别写作风格（短句 vs 长句）
- 了解句长与突变度的关系
- 发现句长异常的素材

---

这是第3和第4个维度。最后还有一个：质量评分系统。

继续输出吗？
