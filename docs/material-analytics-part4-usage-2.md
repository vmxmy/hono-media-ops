# 素材模型数据分析 - 使用情况分析维度（续1）

## 二、素材生命周期分析

### 2.1 生命周期阶段定义
```typescript
type LifecycleStage =
  | 'new'           // 新建：创建<7天
  | 'active'        // 活跃：最近30天使用过
  | 'mature'        // 成熟：创建>30天且持续使用
  | 'declining'     // 衰退：30-90天未使用
  | 'dormant'       // 休眠：90天以上未使用
  | 'unused';       // 未使用：从未被使用

interface MaterialLifecycle {
  materialId: string
  sourceTitle: string
  stage: LifecycleStage

  // 时间指标
  createdAt: Date
  firstUsedAt: Date | null
  lastUsedAt: Date | null
  daysSinceCreation: number
  daysSinceLastUse: number | null

  // 使用指标
  totalUses: number
  usageFrequency: number          // 使用频率 (次/天)
  peakUsagePeriod: string         // 使用高峰期

  // 预测
  predictedNextUse: Date | null   // 预测下次使用时间
  churnRisk: number               // 流失风险 (0-100)
}
```

**生命周期判断逻辑**：
```typescript
function determineLifecycleStage(material: MaterialData): LifecycleStage {
  const daysSinceCreation = getDaysSince(material.createdAt);
  const daysSinceLastUse = material.lastUsedAt
    ? getDaysSince(material.lastUsedAt)
    : null;

  // 从未使用
  if (material.totalUses === 0) {
    return 'unused';
  }

  // 新建素材
  if (daysSinceCreation <= 7) {
    return 'new';
  }

  // 活跃素材
  if (daysSinceLastUse !== null && daysSinceLastUse <= 30) {
    return 'active';
  }

  // 成熟素材
  if (daysSinceCreation > 30 && material.usageFrequency > 0.1) {
    return 'mature';
  }

  // 衰退素材
  if (daysSinceLastUse !== null && daysSinceLastUse > 30 && daysSinceLastUse <= 90) {
    return 'declining';
  }

  // 休眠素材
  if (daysSinceLastUse !== null && daysSinceLastUse > 90) {
    return 'dormant';
  }

  return 'unused';
}
```

---

### 2.2 生命周期分布
```typescript
interface LifecycleDistribution {
  stage: LifecycleStage
  count: number
  percentage: number
  avgQualityScore: number
  avgUsageCount: number
}
```

**数据来源**：
```sql
-- 需要在应用层计算生命周期阶段后统计
SELECT
  stage,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage,
  AVG(quality_score) as avg_quality_score,
  AVG(use_count) as avg_usage_count
FROM material_lifecycle_view
WHERE user_id = $1
GROUP BY stage
ORDER BY
  CASE stage
    WHEN 'new' THEN 1
    WHEN 'active' THEN 2
    WHEN 'mature' THEN 3
    WHEN 'declining' THEN 4
    WHEN 'dormant' THEN 5
    WHEN 'unused' THEN 6
  END;
```

**展示方式**：
- 漏斗图：显示素材从新建到休眠的流转
- 饼图：显示各阶段的占比
- 表格：显示各阶段的详细统计

---

这是第二个维度。接下来还有：
- 使用热力图
- 冷门素材识别

继续吗？
