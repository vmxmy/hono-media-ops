# 素材模型数据分析 - 基础统计维度

## 一、核心指标卡片 (Overview Cards)

### 1.1 总量统计
```typescript
interface MaterialOverview {
  totalCount: number              // 素材总数
  successCount: number            // 成功解析数
  failedCount: number             // 失败数
  pendingCount: number            // 待处理数
  successRate: number             // 成功率 (%)
}
```

**数据来源**：
- `COUNT(*) WHERE deleted_at IS NULL`
- `COUNT(*) FILTER (WHERE status = 'SUCCESS')`
- `COUNT(*) FILTER (WHERE status = 'FAILED')`
- `COUNT(*) FILTER (WHERE status = 'PENDING')`

**展示方式**：4个并排的数字卡片，成功率用进度条显示

---

### 1.2 增长趋势
```typescript
interface GrowthTrend {
  newToday: number                // 今日新增
  newThisWeek: number             // 本周新增
  newThisMonth: number            // 本月新增
  weekOverWeekGrowth: number      // 周环比增长率 (%)
  monthOverMonthGrowth: number    // 月环比增长率 (%)
}
```

**数据来源**：
```sql
-- 今日新增
COUNT(*) WHERE DATE(created_at) = CURRENT_DATE

-- 本周新增
COUNT(*) WHERE created_at >= date_trunc('week', CURRENT_DATE)

-- 本月新增
COUNT(*) WHERE created_at >= date_trunc('month', CURRENT_DATE)
```

**展示方式**：带趋势箭头的数字卡片（↑ 绿色表示增长，↓ 红色表示下降）

---

### 1.3 使用情况
```typescript
interface UsageStats {
  totalUsageCount: number         // 总使用次数
  avgUsagePerMaterial: number     // 平均使用次数
  usageRate: number               // 使用率 (被使用过的素材占比 %)
  mostUsedCount: number           // 最高使用次数
}
```

**数据来源**：
```sql
SELECT
  SUM(use_count) as total_usage_count,
  AVG(use_count) as avg_usage_per_material,
  COUNT(*) FILTER (WHERE use_count > 0) * 100.0 / COUNT(*) as usage_rate,
  MAX(use_count) as most_used_count
FROM style_analyses
WHERE deleted_at IS NULL AND user_id = $1;
```

**展示方式**：数字卡片 + 环形进度图（使用率）

---

### 1.4 质量指标
```typescript
interface QualityMetrics {
  avgWordCount: number            // 平均字数
  avgParaCount: number            // 平均段落数
  avgBurstiness: number           // 平均突变度
  avgTtr: number                  // 平均词汇丰富度
  avgSentLen: number              // 平均句长
}
```

**数据来源**：
```sql
SELECT
  AVG(word_count) as avg_word_count,
  AVG(para_count) as avg_para_count,
  AVG(metrics_burstiness) as avg_burstiness,
  AVG(metrics_ttr) as avg_ttr,
  AVG(metrics_avg_sent_len) as avg_sent_len
FROM style_analyses
WHERE deleted_at IS NULL
  AND user_id = $1
  AND status = 'SUCCESS';
```

**展示方式**：5个小卡片，每个显示一个指标的平均值

---

## 二、状态分布

### 2.1 状态饼图
```typescript
interface StatusDistribution {
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  count: number
  percentage: number
  color: string
}
```

**数据来源**：
```sql
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM style_analyses
WHERE deleted_at IS NULL AND user_id = $1
GROUP BY status;
```

**展示方式**：饼图，颜色映射：
- SUCCESS: 绿色 (#22c55e)
- FAILED: 红色 (#ef4444)
- PENDING: 黄色 (#f59e0b)

---

## 三、时间趋势

### 3.1 创建趋势折线图
```typescript
interface CreationTrend {
  date: string                    // YYYY-MM-DD
  count: number                   // 当日创建数
  cumulativeCount: number         // 累计数
}
```

**数据来源**：
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as count,
  SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_count
FROM style_analyses
WHERE deleted_at IS NULL
  AND user_id = $1
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

**展示方式**：双Y轴折线图
- 左Y轴：每日创建数（柱状图）
- 右Y轴：累计数（折线图）

---

## 四、实现建议

### 4.1 服务层方法
创建 `src/server/services/material-analytics.service.ts`：

```typescript
export const materialAnalyticsService = {
  // 获取概览统计
  async getOverview(userId: string): Promise<MaterialOverview>

  // 获取增长趋势
  async getGrowthTrend(userId: string): Promise<GrowthTrend>

  // 获取使用统计
  async getUsageStats(userId: string): Promise<UsageStats>

  // 获取质量指标
  async getQualityMetrics(userId: string): Promise<QualityMetrics>

  // 获取状态分布
  async getStatusDistribution(userId: string): Promise<StatusDistribution[]>

  // 获取创建趋势
  async getCreationTrend(userId: string, days: number): Promise<CreationTrend[]>
}
```

### 4.2 API Router
创建 `src/server/api/routers/material-analytics.ts`：

```typescript
export const materialAnalyticsRouter = createTRPCRouter({
  getOverview: protectedProcedure.query(({ ctx }) =>
    ctx.services.materialAnalytics.getOverview(ctx.user.id)
  ),

  getGrowthTrend: protectedProcedure.query(({ ctx }) =>
    ctx.services.materialAnalytics.getGrowthTrend(ctx.user.id)
  ),

  // ... 其他方法
})
```

---

这是第一部分的基础统计维度设计。接下来我可以继续设计：
- 第二部分：质量分析维度（字数分布、指标散点图等）
- 第三部分：分类分析维度（类型分布、对比等）
- 第四部分：使用情况分析（Top素材、生命周期等）

您觉得这个基础统计维度的设计如何？需要调整或补充什么吗？
