# 素材模型数据分析 - 使用情况分析维度（续2）

## 三、使用热力图

### 3.1 时间热力图
```typescript
interface UsageHeatmap {
  hour: number                    // 0-23
  dayOfWeek: number               // 0-6 (0=Sunday)
  usageCount: number              // 该时段的使用次数
  intensity: number               // 强度 (0-100)
}
```

**数据来源**：
```sql
SELECT
  EXTRACT(HOUR FROM t.created_at)::int as hour,
  EXTRACT(DOW FROM t.created_at)::int as day_of_week,
  COUNT(*) as usage_count,
  COUNT(*) * 100.0 / MAX(COUNT(*)) OVER () as intensity
FROM tasks t
JOIN style_analyses sa ON t.ref_material_id = sa.id
WHERE t.deleted_at IS NULL
  AND sa.deleted_at IS NULL
  AND sa.user_id = $1
  AND t.created_at >= NOW() - INTERVAL '90 days'
GROUP BY
  EXTRACT(HOUR FROM t.created_at),
  EXTRACT(DOW FROM t.created_at)
ORDER BY day_of_week, hour;
```

**展示方式**：
- 热力图：X轴为小时(0-23)，Y轴为星期(周日-周六)
- 颜色深度表示使用频率
- 帮助识别使用高峰时段

---

### 3.2 素材使用日历
```typescript
interface UsageCalendar {
  date: string                    // YYYY-MM-DD
  usageCount: number              // 当日使用次数
  uniqueMaterialsUsed: number     // 当日使用的不同素材数
  topMaterialId: string           // 当日最常用素材
}
```

**展示方式**：
- 日历热力图（类似GitHub贡献图）
- 显示最近90天或365天的使用情况
- 颜色深度表示使用频率

---

## 四、冷门素材识别

### 4.1 冷门素材定义
```typescript
interface UnpopularMaterial {
  id: string
  sourceTitle: string
  primaryType: string
  qualityScore: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'

  // 冷门原因
  reason: 'never_used' | 'long_unused' | 'low_quality' | 'outdated'
  reasonDetail: string

  // 时间指标
  daysSinceCreation: number
  daysSinceLastUse: number | null

  // 建议操作
  suggestedAction: 'test' | 'improve' | 'archive' | 'delete'
  actionReason: string
}
```

**冷门判断逻辑**：
```typescript
function identifyUnpopularMaterials(materials: Material[]): UnpopularMaterial[] {
  return materials
    .filter(m => {
      // 从未使用且创建超过30天
      if (m.useCount === 0 && m.daysSinceCreation > 30) return true;

      // 90天以上未使用
      if (m.daysSinceLastUse !== null && m.daysSinceLastUse > 90) return true;

      // 质量评分低于45分
      if (m.qualityScore < 45) return true;

      return false;
    })
    .map(m => ({
      ...m,
      reason: determineUnpopularReason(m),
      reasonDetail: getReasonDetail(m),
      suggestedAction: getSuggestedAction(m),
      actionReason: getActionReason(m)
    }));
}

function getSuggestedAction(material: Material): 'test' | 'improve' | 'archive' | 'delete' {
  // 高质量但未使用 -> 测试
  if (material.qualityScore >= 75 && material.useCount === 0) {
    return 'test';
  }

  // 中等质量且长期未使用 -> 改进
  if (material.qualityScore >= 60 && material.qualityScore < 75) {
    return 'improve';
  }

  // 低质量 -> 删除
  if (material.qualityScore < 45) {
    return 'delete';
  }

  // 其他 -> 归档
  return 'archive';
}
```

---

### 4.2 冷门素材列表
**展示方式**：
- 表格显示冷门素材
- 按建议操作分组
- 支持批量操作（归档/删除）

---

第四部分（使用情况分析维度）已完成！

素材模型的全部4个部分设计已完成：
✅ 第一部分：基础统计维度
✅ 第二部分：质量分析维度
✅ 第三部分：分类分析维度
✅ 第四部分：使用情况分析维度

接下来可以：
1. 开始实现素材模型的数据分析功能
2. 或者继续设计其他3个模型（提示词、文章、小红书图片）

您希望如何进行？
