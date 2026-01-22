# 素材模型数据分析设计

## 一、数据表字段分析

### 1.1 基础字段
- **标识**: id, userId
- **时间**: createdAt, updatedAt, deletedAt
- **来源**: sourceUrl, sourceTitle
- **分类**: styleName, primaryType
- **版本**: analysisVersion
- **状态**: status (PENDING, SUCCESS, FAILED)

### 1.2 数值指标
- **内容规模**: wordCount, paraCount
- **使用情况**: useCount
- **文本指标**:
  - metricsBurstiness (句长突变度)
  - metricsTtr (词汇丰富度 0-1)
  - metricsAvgSentLen (平均句长)

### 1.3 结构化数据 (JSONB)
- **风格特征**: styleIdentity
- **指标约束**: metricsConstraints
- **词汇逻辑**: lexicalLogic (包含 tone_keywords)
- **修辞逻辑**: rhetoricLogic
- **样本数据**: goldenSample, transferDemo
- **规则系统**: coreRules, blueprint, antiPatterns
- **元数据**: metadata (parse_success, parser_version)

### 1.4 向量搜索
- embedding (1024维向量)
- embeddingContentHash
- embeddingModelVersion

---

## 二、数据展示维度设计

### 2.1 概览统计 (Overview Statistics)

#### A. 核心指标卡片
```typescript
interface MaterialOverview {
  // 总量统计
  totalCount: number              // 素材总数
  successCount: number            // 成功解析数
  failedCount: number             // 失败数
  pendingCount: number            // 待处理数

  // 增长趋势
  newThisWeek: number             // 本周新增
  newThisMonth: number            // 本月新增
  growthRate: number              // 增长率 (%)

  // 使用情况
  totalUsageCount: number         // 总使用次数
  avgUsagePerMaterial: number     // 平均使用次数
  mostUsedMaterialId: string      // 最常用素材ID

  // 质量指标
  avgWordCount: number            // 平均字数
  avgParaCount: number            // 平均段落数
  avgBurstiness: number           // 平均突变度
  avgTtr: number                  // 平均词汇丰富度
}
```

#### B. 状态分布饼图
- SUCCESS vs FAILED vs PENDING
- 显示百分比和数量

#### C. 时间趋势折线图
- 最近30天/90天的创建趋势
- 按日期聚合素材创建数量

---

### 2.2 质量分析 (Quality Analysis)

#### A. 字数分布直方图
- X轴: 字数区间 (0-1000, 1000-2000, ...)
- Y轴: 素材数量
- 帮助识别素材长度分布

#### B. 指标分布散点图
- X轴: TTR (词汇丰富度)
- Y轴: Burstiness (句长突变度)
- 点大小: wordCount
- 点颜色: primaryType
- 帮助识别高质量素材

#### C. 段落数分布
- 柱状图显示段落数分布
- 识别结构化程度

#### D. 平均句长分布
- 箱线图或直方图
- 识别写作风格差异

---

### 2.3 分类分析 (Category Analysis)

#### A. 类型分布 (primaryType)
```typescript
interface TypeDistribution {
  type: string                    // narrative, tutorial, opinion, etc.
  count: number                   // 数量
  percentage: number              // 占比
  avgWordCount: number            // 该类型平均字数
  avgUsageCount: number           // 该类型平均使用次数
  avgBurstiness: number           // 该类型平均突变度
  avgTtr: number                  // 该类型平均TTR
}
```

#### B. 类型对比雷达图
- 多维度对比不同类型的特征
- 维度: wordCount, paraCount, burstiness, ttr, usageCount

#### C. 类型趋势
- 不同类型随时间的创建趋势
- 堆叠面积图

---

### 2.4 使用情况分析 (Usage Analysis)

#### A. Top使用素材列表
```typescript
interface TopUsedMaterial {
  id: string
  sourceTitle: string
  styleName: string
  primaryType: string
  useCount: number
  lastUsedAt: Date | null
  wordCount: number
  createdAt: Date
}
```

#### B. 使用频率分布
- 直方图: 使用次数区间 vs 素材数量
- 识别冷门和热门素材

#### C. 使用时间热力图
- X轴: 日期
- Y轴: 小时
- 颜色深度: 使用次数
- 识别使用高峰时段

#### D. 素材生命周期分析
```typescript
interface MaterialLifecycle {
  materialId: string
  createdAt: Date
  firstUsedAt: Date | null
  lastUsedAt: Date | null
  daysSinceCreation: number
  daysSinceLastUse: number
  totalUses: number
  usageFrequency: number          // 使用次数/天
  isActive: boolean               // 最近30天是否使用
}
```

---

### 2.5 词汇分析 (Lexical Analysis)

#### A. 高频语气词云
- 从 lexicalLogic.tone_keywords 提取
- 词云大小表示出现频率
- 颜色表示情感倾向

#### B. 语气词分布
```typescript
interface ToneKeywordStats {
  keyword: string
  frequency: number               // 出现次数
  materialCount: number           // 包含该词的素材数
  avgWordCountInMaterials: number // 包含该词的素材平均字数
  associatedTypes: string[]       // 关联的primaryType
}
```

#### C. 词汇丰富度分布
- TTR值的分布直方图
- 识别词汇多样性

---

### 2.6 时间分析 (Temporal Analysis)

#### A. 创建时间分布
- 按小时统计创建时间
- 识别创建高峰时段

#### B. 按星期分布
- 周一到周日的创建分布
- 柱状图

#### C. 月度趋势
- 最近12个月的创建趋势
- 折线图 + 移动平均线

#### D. 素材年龄分布
```typescript
interface MaterialAge {
  ageRange: string                // "0-7天", "8-30天", "31-90天", "90天+"
  count: number
  avgUsageCount: number
  activeRate: number              // 该年龄段的活跃率
}
```

---

### 2.7 质量健康度 (Quality Health)

#### A. 解析成功率
- 成功率趋势图
- 按时间段统计

#### B. 版本分布
- analysisVersion 的分布
- 识别需要升级的素材

#### C. 元数据完整性
```typescript
interface MetadataCompleteness {
  hasStyleName: number            // 有风格名称的数量
  hasPrimaryType: number          // 有类型的数量
  hasMetrics: number              // 有指标的数量
  hasEmbedding: number            // 有向量的数量
  completenessScore: number       // 完整性评分 (0-100)
}
```

#### D. 异常检测
- 字数异常 (过少或过多)
- 指标异常 (TTR过低, Burstiness过高)
- 长期未使用素材

---

### 2.8 关联分析 (Correlation Analysis)

#### A. 字数与使用次数相关性
- 散点图 + 趋势线
- 相关系数

#### B. 指标与使用次数相关性
- 多维度相关性矩阵
- 识别影响使用的关键指标

#### C. 类型与质量指标关系
- 箱线图对比不同类型的指标分布

---

### 2.9 向量搜索分析 (Embedding Analysis)

#### A. 向量覆盖率
- 有embedding的素材占比
- 按时间趋势

#### B. 向量模型版本分布
- embeddingModelVersion 分布
- 识别需要重新生成向量的素材

#### C. 内容变化检测
- embeddingContentHash 变化统计
- 识别内容更新频率

---

## 三、数据查询需求

### 3.1 基础统计查询
```sql
-- 概览统计
SELECT
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_count,
  COUNT(*) FILTER (WHERE status = 'FAILED') as failed_count,
  COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
  AVG(word_count) as avg_word_count,
  AVG(para_count) as avg_para_count,
  AVG(metrics_burstiness) as avg_burstiness,
  AVG(metrics_ttr) as avg_ttr,
  SUM(use_count) as total_usage_count
FROM style_analyses
WHERE deleted_at IS NULL AND user_id = $1;
```

### 3.2 时间趋势查询
```sql
-- 最近30天创建趋势
SELECT
  DATE(created_at) as date,
  COUNT(*) as count,
  AVG(word_count) as avg_word_count
FROM style_analyses
WHERE deleted_at IS NULL
  AND user_id = $1
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

### 3.3 类型分布查询
```sql
-- 类型统计
SELECT
  primary_type,
  COUNT(*) as count,
  AVG(word_count) as avg_word_count,
  AVG(use_count) as avg_usage_count,
  AVG(metrics_burstiness) as avg_burstiness,
  AVG(metrics_ttr) as avg_ttr
FROM style_analyses
WHERE deleted_at IS NULL
  AND user_id = $1
  AND primary_type IS NOT NULL
GROUP BY primary_type
ORDER BY count DESC;
```

### 3.4 Top使用素材查询
```sql
-- Top 10使用素材
SELECT
  id,
  source_title,
  style_name,
  primary_type,
  use_count,
  word_count,
  created_at,
  (
    SELECT MAX(created_at)
    FROM tasks
    WHERE ref_material_id = style_analyses.id
      AND deleted_at IS NULL
  ) as last_used_at
FROM style_analyses
WHERE deleted_at IS NULL
  AND user_id = $1
ORDER BY use_count DESC
LIMIT 10;
```

---

## 四、实现优先级

### P0 (核心必须)
1. 概览统计卡片
2. 状态分布饼图
3. 时间趋势折线图
4. Top使用素材列表
5. 类型分布柱状图

### P1 (重要)
6. 字数分布直方图
7. 指标散点图
8. 使用频率分布
9. 词汇词云
10. 质量健康度指标

### P2 (增强)
11. 关联分析
12. 素材生命周期
13. 异常检测
14. 向量搜索分析

---

## 五、技术实现建议

### 5.1 服务层设计
- 创建 `material-analytics.service.ts`
- 实现各维度的统计查询方法
- 使用 SQL 聚合函数提高性能

### 5.2 API设计
- 创建 `materialAnalytics` router
- 提供细粒度的查询接口
- 支持时间范围、类型筛选等参数

### 5.3 前端组件
- 复用现有的图表组件
- 使用 A2UI 协议渲染
- 支持交互式筛选和钻取

### 5.4 性能优化
- 使用数据库索引
- 实现查询结果缓存
- 分页加载大数据集
- 异步加载非关键数据
