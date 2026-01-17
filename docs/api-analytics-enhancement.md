# Analytics API Enhancement Plan

## 当前状态分析

### 现有端点
1. **getStatistics** - 基础统计（总数、类型分布、状态分布）
2. **getUserStyleProfile** - 用户画像（平均指标、Top 5 类型、关键词）
3. **getMetricsTrend** - 时间趋势（按日期聚合的平均指标）
4. **getPrimaryTypeInsights** - 类型洞察（单个类型的统计）
5. **getDetailedMetrics** - 详细指标列表

### 数据缺口

#### 1. 使用频率数据（已修复 useCount）
- ✅ useCount 现在从 pipelines 表正确计算
- ❌ 没有 API 端点暴露使用频率排行
- ❌ 没有使用趋势分析

#### 2. 时间粒度不足
- ✅ 有按日的趋势
- ❌ 缺少按周/月的聚合
- ❌ 缺少时间段对比

#### 3. Pipeline 数据未利用
- ❌ 没有 pipeline 成功率分析
- ❌ 没有风格-提示词组合分析
- ❌ 没有用户工作流洞察

## 新增 API 端点设计

### 1. 使用频率分析

#### `getTopUsedStyles`
获取最常用的风格分析

**输入：**
```typescript
{
  userId?: string;
  limit?: number; // default: 10
  timeRange?: { start: Date; end: Date };
}
```

**输出：**
```typescript
{
  items: Array<{
    id: string;
    sourceTitle: string;
    styleName: string;
    primaryType: string;
    useCount: number;
    lastUsedAt: Date;
    avgMetrics: {
      wordCount: number;
      ttr: number;
      burstiness: number;
    };
  }>;
}
```

#### `getTopUsedImagePrompts`
获取最常用的图片提示词

**输入/输出：** 类似 getTopUsedStyles

### 2. 时间段分析

#### `getMetricsByTimeRange`
按周/月聚合的指标统计

**输入：**
```typescript
{
  userId: string;
  granularity: 'week' | 'month';
  startDate: Date;
  endDate: Date;
}
```

**输出：**
```typescript
{
  periods: Array<{
    period: string; // '2024-W01' or '2024-01'
    totalAnalyses: number;
    avgMetrics: { ... };
    topTypes: Array<{ type: string; count: number }>;
  }>;
}
```

### 3. Pipeline 分析

#### `getPipelineStatistics`
Pipeline 成功率和状态分析

**输入：**
```typescript
{
  userId?: string;
  timeRange?: { start: Date; end: Date };
}
```

**输出：**
```typescript
{
  total: number;
  byStatus: Record<string, number>;
  successRate: number;
  avgCompletionTime: number;
  topStyleAnalyses: Array<{ id: string; title: string; useCount: number }>;
  topImagePrompts: Array<{ id: string; title: string; useCount: number }>;
}
```

#### `getStylePromptCombinations`
风格-提示词组合分析

**输入：**
```typescript
{
  userId: string;
  limit?: number;
}
```

**输出：**
```typescript
{
  combinations: Array<{
    styleAnalysisId: string;
    styleTitle: string;
    imagePromptId: string;
    promptTitle: string;
    useCount: number;
    successRate: number;
  }>;
}
```

### 4. 使用模式分析

#### `getUserUsagePattern`
用户使用模式洞察

**输入：**
```typescript
{
  userId: string;
}
```

**输出：**
```typescript
{
  mostActiveHours: Array<{ hour: number; count: number }>;
  mostActiveDays: Array<{ dayOfWeek: number; count: number }>;
  avgAnalysesPerWeek: number;
  preferredTypes: Array<{ type: string; percentage: number }>;
  styleConsistency: number; // 0-1, 风格一致性评分
}
```

### 5. 对比分析

#### `compareMetricsWithAverage`
用户指标与平均值对比

**输入：**
```typescript
{
  userId: string;
}
```

**输出：**
```typescript
{
  userMetrics: { wordCount: number; ttr: number; burstiness: number };
  globalAverage: { wordCount: number; ttr: number; burstiness: number };
  percentile: { wordCount: number; ttr: number; burstiness: number };
  comparison: {
    wordCount: 'above' | 'below' | 'average';
    ttr: 'above' | 'below' | 'average';
    burstiness: 'above' | 'below' | 'average';
  };
}
```

## 实现优先级

### Phase 1: 使用频率（高价值，低复杂度）
- ✅ useCount 已修复
- [ ] getTopUsedStyles
- [ ] getTopUsedImagePrompts
- [ ] getPipelineStatistics

### Phase 2: 时间分析（中价值，中复杂度）
- [ ] getMetricsByTimeRange
- [ ] getUserUsagePattern

### Phase 3: 高级分析（高价值，高复杂度）
- [ ] getStylePromptCombinations
- [ ] compareMetricsWithAverage

## 数据库查询优化建议

1. **索引优化**
   - pipelines 表需要 (styleAnalysisId, status) 复合索引
   - pipelines 表需要 (imagePromptId, status) 复合索引
   - pipelines 表需要 (userId, createdAt) 复合索引

2. **查询优化**
   - 使用 CTE 减少重复子查询
   - 使用 EXPLAIN ANALYZE 验证查询性能
   - 考虑添加物化视图用于复杂聚合

3. **缓存策略**
   - 全局统计数据可以缓存 1 小时
   - 用户个人数据可以缓存 5 分钟
   - 实时数据（如 pipeline 状态）不缓存
