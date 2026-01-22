# 质量评分系统 - 展示方式

## 一、评分卡片展示

### 1.1 素材评分卡片
```typescript
interface ScoreCardNode {
  type: 'card'
  children: [
    // 顶部：等级徽章 + 总分
    {
      type: 'row'
      justify: 'between'
      align: 'center'
      children: [
        {
          type: 'badge'
          text: 'S'  // 等级
          color: 'warning'  // 金色
          size: 'lg'
        },
        {
          type: 'text'
          text: '92分'
          variant: 'h2'
          weight: 'bold'
        }
      ]
    },

    // 中部：4个维度得分
    {
      type: 'row'
      gap: '1rem'
      wrap: true
      children: [
        {
          type: 'column'
          gap: '0.25rem'
          className: 'flex-1 min-w-[100px]'
          children: [
            { type: 'text', text: '23', variant: 'h3', weight: 'bold' },
            { type: 'text', text: '内容质量', variant: 'caption', color: 'muted' },
            { type: 'progress', value: 92, max: 25 }  // 23/25
          ]
        },
        // ... 其他3个维度
      ]
    },

    // 底部：问题列表
    {
      type: 'column'
      gap: '0.5rem'
      children: [
        { type: 'text', text: '质量问题', variant: 'body', weight: 'semibold' },
        {
          type: 'badge'
          text: '⚠️ 字数过少 (487字)'
          color: 'warning'
        },
        {
          type: 'badge'
          text: 'ℹ️ 从未被使用'
          color: 'default'
        }
      ]
    }
  ]
}
```

---

## 二、评分分布图表

### 2.1 等级分布饼图
```typescript
interface GradeDistributionChart {
  type: 'chart-pie'
  data: [
    { id: 'S', label: 'S级', value: 5, color: '#fbbf24' },
    { id: 'A', label: 'A级', value: 12, color: '#22c55e' },
    { id: 'B', label: 'B级', value: 18, color: '#3b82f6' },
    { id: 'C', label: 'C级', value: 6, color: '#f59e0b' },
    { id: 'D', label: 'D级', value: 2, color: '#ef4444' }
  ]
  height: 280
  innerRadius: 0.5
}
```

### 2.2 评分分布直方图
```typescript
interface ScoreDistributionChart {
  type: 'chart-histogram'
  data: [
    { range: '0-20', count: 1 },
    { range: '20-40', count: 3 },
    { range: '40-60', count: 8 },
    { range: '60-80', count: 20 },
    { range: '80-100', count: 11 }
  ]
  height: 250
  xAxisLabel: '评分区间'
  yAxisLabel: '素材数量'
}
```

---

## 三、Top素材列表

### 3.1 高分素材列表
```typescript
interface TopScoredMaterialsList {
  type: 'column'
  gap: '0.5rem'
  children: topMaterials.map((material, index) => ({
    type: 'row'
    gap: '1rem'
    align: 'center'
    justify: 'between'
    className: 'p-3 rounded-lg hover:bg-muted/30'
    children: [
      // 左侧：排名 + 信息
      {
        type: 'row'
        gap: '1rem'
        align: 'center'
        style: { flex: 1 }
        children: [
          {
            type: 'text'
            text: `#${index + 1}`
            variant: 'h3'
            color: 'muted'
          },
          {
            type: 'column'
            gap: '0.25rem'
            children: [
              { type: 'text', text: material.sourceTitle, weight: 'medium' },
              { type: 'text', text: material.primaryType, variant: 'caption', color: 'muted' }
            ]
          }
        ]
      },

      // 右侧：等级 + 分数
      {
        type: 'row'
        gap: '0.5rem'
        align: 'center'
        children: [
          { type: 'badge', text: material.grade, color: getGradeColor(material.grade) },
          { type: 'text', text: `${material.totalScore}分`, variant: 'body', weight: 'bold' }
        ]
      }
    ]
  }))
}
```

---

这是展示方式的基本设计。质量评分系统的第二部分（质量分析维度）已经全部完成。

接下来我们可以继续设计：
- 第三部分：分类分析维度
- 第四部分：使用情况分析维度

需要继续吗？还是先实现这部分内容？
