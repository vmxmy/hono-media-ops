# 素材模型数据分析 - 分类分析维度（续）

## 三、类型趋势分析

### 3.1 类型创建趋势
```typescript
interface TypeTrend {
  date: string                    // YYYY-MM-DD
  type: string                    // 类型名称
  count: number                   // 当日该类型的创建数
  cumulativeCount: number         // 累计数
}
```

**数据来源**：
```sql
SELECT
  DATE(created_at) as date,
  primary_type as type,
  COUNT(*) as count,
  SUM(COUNT(*)) OVER (
    PARTITION BY primary_type
    ORDER BY DATE(created_at)
  ) as cumulative_count
FROM style_analyses
WHERE deleted_at IS NULL
  AND user_id = $1
  AND primary_type IS NOT NULL
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at), primary_type
ORDER BY date, type;
```

**展示方式**：
- 堆叠面积图：显示不同类型随时间的创建趋势
- 多条折线图：每个类型一条线
- 可切换时间范围（30天/90天/全部）

---

### 3.2 类型增长率分析
```typescript
interface TypeGrowthRate {
  type: string
  lastWeekCount: number           // 上周创建数
  thisWeekCount: number           // 本周创建数
  weekOverWeekGrowth: number      // 周环比增长率 (%)
  lastMonthCount: number          // 上月创建数
  thisMonthCount: number          // 本月创建数
  monthOverMonthGrowth: number    // 月环比增长率 (%)
}
```

**数据来源**：
```sql
WITH weekly_stats AS (
  SELECT
    primary_type,
    COUNT(*) FILTER (
      WHERE created_at >= date_trunc('week', CURRENT_DATE)
    ) as this_week_count,
    COUNT(*) FILTER (
      WHERE created_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '7 days'
        AND created_at < date_trunc('week', CURRENT_DATE)
    ) as last_week_count
  FROM style_analyses
  WHERE deleted_at IS NULL
    AND user_id = $1
    AND primary_type IS NOT NULL
  GROUP BY primary_type
)
SELECT
  primary_type as type,
  last_week_count,
  this_week_count,
  CASE
    WHEN last_week_count > 0
    THEN ((this_week_count - last_week_count)::float / last_week_count * 100)
    ELSE NULL
  END as week_over_week_growth
FROM weekly_stats
ORDER BY week_over_week_growth DESC NULLS LAST;
```

**展示方式**：
- 表格显示各类型的增长率
- 带颜色标识：绿色表示增长，红色表示下降
- 排序：按增长率降序

---

## 四、类型与质量关系

### 4.1 类型质量分布箱线图
```typescript
interface TypeQualityBoxPlot {
  type: string
  min: number                     // 最低分
  q1: number                      // 25分位数
  median: number                  // 中位数
  q3: number                      // 75分位数
  max: number                     // 最高分
  mean: number                    // 平均分
  outliers: number[]              // 异常值
}
```

**数据来源**：
```sql
SELECT
  primary_type as type,
  MIN(quality_score) as min,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY quality_score) as q1,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY quality_score) as median,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY quality_score) as q3,
  MAX(quality_score) as max,
  AVG(quality_score) as mean
FROM (
  -- 这里需要先计算每个素材的质量分
  -- 实际实现时会在应用层计算
  SELECT id, primary_type, calculate_quality_score(...) as quality_score
  FROM style_analyses
  WHERE deleted_at IS NULL AND user_id = $1
) scores
GROUP BY primary_type
ORDER BY mean DESC;
```

**展示方式**：
- 箱线图，每个类型一个箱体
- 显示中位数、四分位数、异常值
- 帮助识别哪些类型质量更稳定

---

第三部分（分类分析维度）已完成。接下来是第四部分：使用情况分析维度。

继续吗？
