# 小红书内容分类字段补充方案

## 背景

### 当前情况

```sql
-- 统计结果 (2026-01-26)
总记录数: 549
缺少 category: 547 (99.6%)
缺少 track: 547 (99.6%)
已有分类: 2 (0.4%)
```

**已有分类示例**:
- `category='tutorial'` + `track='food'` - 日式咖啡冻教程
- `category='explore'` + `track='lifestyle'` - 香港私藏Cafe探店

### 问题

547 条历史记录没有 `category` 和 `track` 字段，影响:
1. 内容分类查询和筛选
2. 发布时间调度策略
3. 标签和关键词优化
4. 内容推荐算法

---

## 字段定义

### category (内容类型)

| 值 | 中文名 | 说明 | 示例 |
|---|--------|------|------|
| `explore` | 探店 | 多家店铺推荐合集 | "深圳15家咖啡店" |
| `review` | 测评 | 单品或多品对比评测 | "5款咖啡机横评" |
| `tutorial` | 教程 | 操作步骤教学 | "手冲咖啡教程" |
| `knowledge` | 知识 | 科普、原理讲解 | "为什么咖啡提神" |
| `recommendation` | 推荐 | 单品种草推荐 | "这款咖啡豆必买" |
| `vlog` | Vlog | 记录分享日常 | "咖啡店一日游" |
| `comparison` | 对比 | AB对比分析 | "手冲vs意式" |
| `collection` | 合集 | 主题内容整理 | "咖啡器具清单" |
| `diy` | DIY | 手工制作 | "自制冷萃咖啡" |
| `case_study` | 案例 | 实战案例分析 | "咖啡店选址分析" |

### track (内容赛道)

| 值 | 中文名 | 说明 |
|---|--------|------|
| `lifestyle` | 生活方式 | 咖啡、茶、探店、打卡 |
| `beauty` | 美妆 | 护肤、彩妆、美容 |
| `fashion` | 时尚 | 穿搭、配饰、潮流 |
| `travel` | 旅行 | 旅游攻略、目的地 |
| `food` | 美食 | 菜谱、教程、探店 |
| `home` | 家居 | 装修、收纳、软装 |
| `parenting` | 育儿 | 母婴、教育 |
| `fitness` | 健身 | 运动、减肥、健康 |
| `education` | 教育 | 学习、技能、考试 |
| `tech` | 科技 | 数码、评测、教程 |
| `pets` | 宠物 | 养宠、萌宠日常 |
| `finance` | 财经 | 理财、投资 |

---

## 分类规则

### 自动分类逻辑

#### 1. 基于标题关键词

```javascript
const categoryRules = [
  {
    category: 'explore',
    keywords: ['家', '间', '必去', '合集', '推荐清单', '宝藏', '私藏'],
    pattern: /\d+[家间].*?(店|咖啡|甜品|餐厅)/,
    examples: ['深圳15家咖啡店', '香港私藏Cafe']
  },
  {
    category: 'tutorial',
    keywords: ['教程', '做法', '步骤', '如何', '怎么做', 'recipe'],
    pattern: /(教程|做法|步骤|如何.*\?)/,
    examples: ['手冲咖啡教程', '拉花教程']
  },
  {
    category: 'knowledge',
    keywords: ['为什么', '原理', '知识', '科普', '你知道吗'],
    pattern: /(为什么|原理|知识|你知道)/,
    examples: ['为什么咖啡提神', '咖啡萃取原理']
  },
  {
    category: 'review',
    keywords: ['测评', '评测', '对比', '横评', 'vs'],
    pattern: /(测评|评测|横评|\d+款)/,
    examples: ['5款咖啡机横评']
  },
  {
    category: 'tutorial',
    keywords: ['注意', '避坑', '技巧', '改善', '解决'],
    pattern: /(注意|避坑|技巧|改善|解决.*问题)/,
    examples: ['拉花注意这3点', '全自动咖啡机故障解决']
  }
]

const trackRules = [
  {
    track: 'lifestyle',
    keywords: ['咖啡', 'cafe', 'coffee', '茶', '探店', '打卡'],
    examples: ['咖啡店', 'Cafe探店']
  },
  {
    track: 'food',
    keywords: ['甜品', '蛋糕', 'ice cream', '冰淇淋', '美食', '餐厅'],
    examples: ['甜品店', '日式料理']
  }
]
```

#### 2. 基于 generated_config 结构

```javascript
// 如果 generated_config 包含多个店铺信息
if (config.length > 2 && config[0].type === 'cover') {
  const shopCount = config.filter(item => item.type === 'content').length
  if (shopCount >= 5) {
    category = 'explore'  // 探店合集
  }
}

// 如果包含步骤说明
if (config.some(item => item.body_points?.some(p => p.includes('步骤')))) {
  category = 'tutorial'  // 教程
}
```

#### 3. 基于 meta_attributes

```javascript
// 探店类型特征
if (meta_attributes?.location_summary?.total_shops >= 5) {
  category = 'explore'
  track = 'lifestyle'
}

// 有店铺类型信息
if (meta_attributes?.shop_types?.length > 0) {
  category = 'explore'
}
```

---

## 实施方案

### 方案A: 基于规则的自动分类 (推荐)

#### 优点
- 快速处理大量数据
- 规则可解释、可调整
- 无需人工介入

#### 缺点
- 准确率依赖规则质量
- 边缘案例可能分类不准

#### 实施步骤

**1. 创建分类函数**

```typescript
// src/server/services/xhs-category-classifier.service.ts

interface ClassificationResult {
  category: string | null
  track: string | null
  confidence: number  // 0-1
  reasoning: string
}

export async function classifyXhsJob(job: {
  source_title: string
  generated_config?: any[]
  meta_attributes?: any
}): Promise<ClassificationResult> {

  const title = job.source_title
  let category: string | null = null
  let track: string | null = null
  let confidence = 0
  let reasoning = ''

  // 规则1: 基于 meta_attributes
  if (job.meta_attributes?.location_summary?.total_shops >= 5) {
    category = 'explore'
    track = 'lifestyle'
    confidence = 0.9
    reasoning = `meta_attributes 显示 ${job.meta_attributes.location_summary.total_shops} 家店铺`
    return { category, track, confidence, reasoning }
  }

  // 规则2: 基于标题关键词 - 探店
  if (/\d+[家间].*(店|咖啡|甜品|餐厅)/.test(title) ||
      /(私藏|宝藏|合集|推荐清单)/.test(title)) {
    category = 'explore'
    confidence = 0.85
    reasoning = '标题包含探店关键词'
  }

  // 规则3: 基于标题关键词 - 教程
  else if (/(教程|做法|步骤|如何.*\?)/.test(title)) {
    category = 'tutorial'
    confidence = 0.8
    reasoning = '标题包含教程关键词'
  }

  // 规则4: 基于标题关键词 - 知识
  else if (/(为什么|原理|知识|你知道)/.test(title)) {
    category = 'knowledge'
    confidence = 0.8
    reasoning = '标题包含知识科普关键词'
  }

  // 规则5: 基于标题关键词 - 技巧/避坑
  else if (/(注意|避坑|技巧|改善|解决.*问题|故障)/.test(title)) {
    category = 'tutorial'
    confidence = 0.75
    reasoning = '标题包含技巧/问题解决关键词'
  }

  // 规则6: 基于标题关键词 - 测评
  else if (/(测评|评测|横评|\d+款)/.test(title)) {
    category = 'review'
    confidence = 0.8
    reasoning = '标题包含测评关键词'
  }

  // 默认: 无法分类
  else {
    confidence = 0
    reasoning = '无法匹配任何规则'
  }

  // 推断 track
  if (/(咖啡|cafe|coffee|茶|探店|打卡)/.test(title)) {
    track = 'lifestyle'
  } else if (/(甜品|蛋糕|ice cream|冰淇淋|美食|餐厅)/.test(title)) {
    track = 'food'
  }

  return { category, track, confidence, reasoning }
}
```

**2. 创建批量更新脚本**

```typescript
// scripts/backfill-xhs-categories.ts

import { db } from '@/server/db'
import { xhsImageJobs } from '@/server/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { classifyXhsJob } from '@/server/services/xhs-category-classifier.service'

async function backfillCategories() {
  console.log('开始补充 category 和 track 字段...')

  // 查询所有缺少分类的记录
  const jobs = await db
    .select()
    .from(xhsImageJobs)
    .where(
      and(
        isNull(xhsImageJobs.category),
        isNull(xhsImageJobs.deletedAt)
      )
    )

  console.log(`找到 ${jobs.length} 条需要分类的记录`)

  const results = {
    total: jobs.length,
    classified: 0,
    high_confidence: 0,  // >= 0.8
    medium_confidence: 0,  // 0.5-0.8
    low_confidence: 0,  // < 0.5
    failed: 0
  }

  for (const job of jobs) {
    try {
      const classification = await classifyXhsJob({
        source_title: job.source_title || '',
        generated_config: job.generated_config as any,
        meta_attributes: job.meta_attributes as any
      })

      if (classification.category) {
        await db
          .update(xhsImageJobs)
          .set({
            category: classification.category,
            track: classification.track,
            updated_at: new Date()
          })
          .where(eq(xhsImageJobs.id, job.id))

        results.classified++

        if (classification.confidence >= 0.8) {
          results.high_confidence++
        } else if (classification.confidence >= 0.5) {
          results.medium_confidence++
        } else {
          results.low_confidence++
        }

        console.log(`✓ ${job.source_title}`)
        console.log(`  category: ${classification.category}, track: ${classification.track}`)
        console.log(`  confidence: ${classification.confidence}, reasoning: ${classification.reasoning}`)
      } else {
        console.log(`✗ ${job.source_title} - 无法分类`)
        results.failed++
      }

    } catch (error) {
      console.error(`处理失败: ${job.id}`, error)
      results.failed++
    }
  }

  console.log('\n=== 分类结果统计 ===')
  console.log(`总记录数: ${results.total}`)
  console.log(`已分类: ${results.classified}`)
  console.log(`  高置信度 (≥0.8): ${results.high_confidence}`)
  console.log(`  中置信度 (0.5-0.8): ${results.medium_confidence}`)
  console.log(`  低置信度 (<0.5): ${results.low_confidence}`)
  console.log(`分类失败: ${results.failed}`)
  console.log(`成功率: ${((results.classified / results.total) * 100).toFixed(2)}%`)
}

backfillCategories()
  .then(() => {
    console.log('补充完成')
    process.exit(0)
  })
  .catch(error => {
    console.error('补充失败:', error)
    process.exit(1)
  })
```

**3. 执行脚本**

```bash
# 开发环境测试 (先测试 10 条)
npm run ts-node scripts/backfill-xhs-categories.ts

# 生产环境执行
NODE_ENV=production npm run ts-node scripts/backfill-xhs-categories.ts
```

---

### 方案B: AI 辅助分类

#### 优点
- 准确率更高
- 可处理复杂边缘案例

#### 缺点
- 需要调用 AI API (成本)
- 处理速度较慢

#### 实施步骤

```typescript
// 使用 Claude/GPT 进行分类
async function classifyWithAI(title: string): Promise<ClassificationResult> {
  const prompt = `
请为以下小红书标题分类:

标题: ${title}

可选 category:
- explore: 探店合集
- tutorial: 教程步骤
- knowledge: 知识科普
- review: 测评对比
- recommendation: 单品推荐

可选 track:
- lifestyle: 生活方式 (咖啡/茶/探店)
- food: 美食 (菜谱/甜品/餐厅)
- tech: 科技 (数码/评测)
- ... (其他赛道)

返回 JSON:
{
  "category": "...",
  "track": "...",
  "confidence": 0.9,
  "reasoning": "..."
}
`

  const response = await callAI(prompt)
  return JSON.parse(response)
}
```

---

### 方案C: 混合方案 (推荐)

1. **先用规则分类** (方案A)
   - 处理 90% 明确的案例
   - 快速、低成本

2. **AI 处理边缘案例** (方案B)
   - 仅处理置信度 < 0.5 的记录
   - 约 10% 的数据量

3. **人工审核** (可选)
   - 抽样检查高置信度结果
   - 修正明显错误

---

## 执行计划

### Phase 1: 准备 (1-2小时)

- [x] 分析数据特征
- [ ] 设计分类规则
- [ ] 编写分类函数
- [ ] 编写测试用例

### Phase 2: 测试 (1-2小时)

- [ ] 随机抽取 50 条数据
- [ ] 人工标注正确分类
- [ ] 测试分类准确率
- [ ] 调整规则优化

### Phase 3: 执行 (30分钟)

- [ ] 备份数据库
- [ ] 执行分类脚本
- [ ] 验证结果
- [ ] 记录日志

### Phase 4: 验证 (30分钟)

- [ ] 抽样检查分类结果
- [ ] 修正明显错误
- [ ] 更新文档

---

## SQL 脚本

### 备份当前数据

```sql
-- 备份 xhs_image_jobs 表
CREATE TABLE xhs_image_jobs_backup_20260126 AS
SELECT * FROM xhs_image_jobs;

-- 验证备份
SELECT COUNT(*) FROM xhs_image_jobs_backup_20260126;
```

### 手动批量更新示例

```sql
-- 更新所有包含"家"、"间"的探店内容
UPDATE xhs_image_jobs
SET
  category = 'explore',
  track = 'lifestyle',
  updated_at = NOW()
WHERE
  deleted_at IS NULL
  AND category IS NULL
  AND source_title ~ '\d+[家间].*(店|咖啡|甜品|餐厅)';

-- 更新所有教程类内容
UPDATE xhs_image_jobs
SET
  category = 'tutorial',
  track = CASE
    WHEN source_title ~* '(咖啡|coffee)' THEN 'lifestyle'
    WHEN source_title ~* '(甜品|蛋糕)' THEN 'food'
    ELSE track
  END,
  updated_at = NOW()
WHERE
  deleted_at IS NULL
  AND category IS NULL
  AND source_title ~ '(教程|做法|步骤|如何)';

-- 更新所有知识类内容
UPDATE xhs_image_jobs
SET
  category = 'knowledge',
  updated_at = NOW()
WHERE
  deleted_at IS NULL
  AND category IS NULL
  AND source_title ~ '(为什么|原理|知识|你知道)';
```

### 验证分类结果

```sql
-- 按 category 统计
SELECT
  category,
  COUNT(*) AS count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS percentage
FROM xhs_image_jobs
WHERE deleted_at IS NULL
GROUP BY category
ORDER BY count DESC;

-- 按 track 统计
SELECT
  track,
  COUNT(*) AS count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS percentage
FROM xhs_image_jobs
WHERE deleted_at IS NULL
GROUP BY track
ORDER BY count DESC;

-- category + track 组合统计
SELECT
  category,
  track,
  COUNT(*) AS count
FROM xhs_image_jobs
WHERE deleted_at IS NULL
  AND category IS NOT NULL
GROUP BY category, track
ORDER BY count DESC;
```

---

## 风险与注意事项

### 风险

1. **分类错误**: 规则可能无法覆盖所有情况
2. **数据不一致**: 更新失败可能导致部分记录不一致
3. **性能影响**: 大量更新可能影响数据库性能

### 缓解措施

1. **备份数据**: 执行前完整备份
2. **分批处理**: 每次更新 100 条，避免长事务
3. **事务保护**: 使用事务确保原子性
4. **日志记录**: 详细记录每次分类结果
5. **人工审核**: 抽样检查 10% 结果

---

## 后续优化

### 1. 自动分类集成

在新建任务时自动分类:

```typescript
// src/server/services/xhs-job.service.ts
export async function createXhsJob(input: CreateXhsJobInput) {
  // 创建任务
  const job = await db.insert(xhsImageJobs).values({
    ...input,
    id: crypto.randomUUID()
  })

  // 自动分类
  const classification = await classifyXhsJob({
    source_title: input.source_title,
    generated_config: input.generated_config,
    meta_attributes: input.meta_attributes
  })

  // 更新分类
  if (classification.category) {
    await db.update(xhsImageJobs)
      .set({
        category: classification.category,
        track: classification.track
      })
      .where(eq(xhsImageJobs.id, job.id))
  }

  return job
}
```

### 2. 分类规则优化

定期分析分类结果，优化规则:

```sql
-- 查找可能分类错误的记录
SELECT
  id,
  source_title,
  category,
  track
FROM xhs_image_jobs
WHERE
  deleted_at IS NULL
  AND (
    -- category 和 title 不匹配
    (category = 'explore' AND source_title !~ '\d+[家间]')
    OR
    (category = 'tutorial' AND source_title !~ '(教程|做法|步骤)')
  )
LIMIT 20;
```

### 3. 用户反馈机制

允许用户修正分类错误:

```typescript
// API endpoint
async function updateJobCategory(jobId: string, category: string, track: string) {
  await db.update(xhsImageJobs)
    .set({ category, track, updated_at: new Date() })
    .where(eq(xhsImageJobs.id, jobId))

  // 记录用户修正，用于优化规则
  await logCategoryCorrection(jobId, category, track)
}
```

---

## 总结

**推荐方案**: 方案A (基于规则的自动分类)

**理由**:
1. 数据特征明显 (标题关键词、店铺数量)
2. 规则可解释、可调整
3. 处理速度快、成本低
4. 预期准确率 >85%

**预计工作量**: 4-6 小时
**预期完成率**: >90%

**下一步**:
1. 编写并测试分类函数
2. 抽样验证准确率
3. 执行批量更新
4. 验证并记录结果
