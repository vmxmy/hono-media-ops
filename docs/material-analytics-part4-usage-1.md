# 素材模型数据分析 - 使用情况分析维度

## 一、Top使用素材

### 1.1 最常用素材列表
```typescript
interface TopUsedMaterial {
  id: string
  sourceTitle: string
  styleName: string
  primaryType: string

  // 使用情况
  useCount: number                // 使用次数
  lastUsedAt: Date | null         // 最后使用时间
  firstUsedAt: Date | null        // 首次使用时间

  // 质量指标
  wordCount: number
  qualityScore: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'

  // 时间指标
  daysSinceCreation: number       // 创建天数
  daysSinceLastUse: number        // 距上次使用天数
  usageFrequency: number          // 使用频率 (次/天)
}
```

**数据来源**：
```sql
SELECT
  sa.id,
  sa.source_title,
  sa.style_name,
  sa.primary_type,
  sa.word_count,
  sa.created_at,

  -- 使用次数（从tasks表统计）
  COUNT(t.id) as use_count,

  -- 首次和最后使用时间
  MIN(t.created_at) as first_used_at,
  MAX(t.created_at) as last_used_at,

  -- 时间计算
  EXTRACT(DAY FROM NOW() - sa.created_at) as days_since_creation,
  EXTRACT(DAY FROM NOW() - MAX(t.created_at)) as days_since_last_use,

  -- 使用频率
  COUNT(t.id)::float / NULLIF(EXTRACT(DAY FROM NOW() - sa.created_at), 0) as usage_frequency

FROM style_analyses sa
LEFT JOIN tasks t ON t.ref_material_id = sa.id AND t.deleted_at IS NULL
WHERE sa.deleted_at IS NULL
  AND sa.user_id = $1
GROUP BY sa.id
ORDER BY use_count DESC
LIMIT 20;
```

**展示方式**：
- 表格或卡片列表
- 显示排名、标题、类型、使用次数
- 点击可查看详情

---

### 1.2 使用趋势对比
```typescript
interface MaterialUsageTrend {
  materialId: string
  materialTitle: string
  trend: {
    date: string
    usageCount: number
  }[]
}
```

**展示方式**：
- 多条折线图，对比Top 5素材的使用趋势
- 识别哪些素材持续受欢迎，哪些在衰退

---

这是第四部分的第一个维度。接下来还有：
- 素材生命周期分析
- 使用热力图
- 冷门素材识别

继续输出吗？
