# N8N 发布工作流 - 查询任务完整信息 SQL

## 完整 SQL 查询语句

在 n8n 的发布工作流中，使用此 SQL 查询任务的完整信息（包含新增的内容分类字段）：

```sql
SELECT
  -- 任务基本信息
  j.id AS job_id,
  j.user_id,
  j.source_url,
  j.source_title,
  j.status,
  j.total_images,
  j.completed_images,
  j.ratio,
  j.resolution,
  j.publish_status,
  j.xhs_note_id,

  -- ✨ 完整的配置信息（用于 Agent 生成正文）
  j.input_content,
  j.style_prompt,
  j.generated_config,                      -- ✨ 包含所有图片配置信息

  -- 🆕 内容分类信息（Migration 0013 新增）
  j.track,                                 -- 🆕 内容赛道 (lifestyle, food, travel, etc.)
  j.category,                              -- 🆕 内容类型 (explore, review, tutorial, knowledge)
  j.meta_attributes,                       -- 🆕 元属性 (JSONB，包含类型特定的结构化数据)
  j.tags,                                  -- 🆕 内容标签 (string array, 5-8 个)
  j.keywords,                              -- 🆕 SEO 关键词 (string array, 6-10 个)

  -- 图片提示词信息
  p.title AS prompt_title,
  p.prompt AS base_prompt,
  p.negative_prompt,
  p.model,
  p.category AS prompt_category,

  -- 已生成的图片列表
  COALESCE(
    json_agg(
      json_build_object(
        'id', i.id,
        'index', i.index,
        'type', i.type,
        'r2_url', i.r2_url,
        'wechat_url', i.wechat_url,
        'wechat_media_id', i.wechat_media_id,
        'core_message', i.core_message,
        'text_content', i.text_content,
        'image_prompt', i.image_prompt,
        'ratio', i.ratio,
        'resolution', i.resolution
      ) ORDER BY i.index
    ) FILTER (WHERE i.id IS NOT NULL),
    '[]'::json
  ) AS images

FROM xhs_image_jobs j
LEFT JOIN image_prompts p ON p.id = j.image_prompt_id
LEFT JOIN xhs_images i ON i.job_id = j.id
WHERE j.id = '{{ $json.body.job_id }}'::uuid
GROUP BY
  j.id,
  j.track,                                 -- 🆕 添加到 GROUP BY
  j.category,                              -- 🆕 添加到 GROUP BY
  j.meta_attributes,                       -- 🆕 添加到 GROUP BY
  j.tags,                                  -- 🆕 添加到 GROUP BY
  j.keywords,                              -- 🆕 添加到 GROUP BY
  p.title,
  p.prompt,
  p.negative_prompt,
  p.model,
  p.category
LIMIT 1
```

## 字段说明

### 新增内容分类字段（Migration 0013）

| 字段 | 类型 | 说明 | 用途 |
|-----|------|------|------|
| `track` | text | 内容赛道 | 用于内容分类和推荐算法（lifestyle, food, travel, beauty, fashion, home, etc.） |
| `category` | text | 内容类型 | 用于内容形式分类（explore, review, tutorial, knowledge, recommendation, etc.） |
| `meta_attributes` | jsonb | 元属性 | 包含类型特定的结构化数据（店铺信息、产品参数、教程配方、知识要点等） |
| `tags` | jsonb | 内容标签 | 用于搜索和推荐的标签数组（5-8 个） |
| `keywords` | jsonb | SEO 关键词 | 用于搜索优化的关键词数组（6-10 个） |

### meta_attributes 结构示例

根据不同的 `category`，`meta_attributes` 包含不同的结构：

#### 探店类 (category = 'explore')
```json
{
  "location_summary": {
    "city": "深圳",
    "districts": ["龙华区", "福田区"],
    "total_shops": 15
  },
  "shop_types": ["咖啡馆", "甜品店"],
  "featured_items": ["蓝柑冰淇淋汽水", "小龙猫蛋糕"],
  "price_range": "30-80",
  "common_features": ["拍照", "网红", "周末打卡"]
}
```

#### 教程类 (category = 'tutorial')
```json
{
  "title": "冰摇柠檬咖啡",
  "difficulty": "easy",
  "time_required": "10分钟",
  "steps": 5,
  "materials_needed": ["浓缩咖啡 40ml", "新鲜柠檬 1个"],
  "suitable_for": ["咖啡爱好者", "新手"],
  "skills_learned": ["雪克摇匀技巧", "柠檬切片装饰"]
}
```

#### 测评类 (category = 'review')
```json
{
  "product_name": "戴森 V15 Detect 无绳吸尘器",
  "brand": "Dyson",
  "price": 5490,
  "rating": 4.5,
  "pros": ["激光探测灰尘可视化", "吸力强劲持久"],
  "cons": ["价格偏高", "重量较重"],
  "specifications": {
    "weight": "3.1kg",
    "power": "230W",
    "battery": "60分钟"
  }
}
```

#### 知识类 (category = 'knowledge')
```json
{
  "topic": "咖啡萃取原理",
  "knowledge_depth": "intermediate",
  "key_points": ["萃取的三个阶段", "影响萃取的四大因素"],
  "myths_busted": ["误区1：水温越高越好", "误区2：萃取时间越长越浓"],
  "actionable_tips": ["使用92-96℃的水温", "手冲时间控制在2-3分钟"]
}
```

## 在 Agent 中使用这些字段

在生成小红书正文的 Agent 提示词中，可以使用这些字段：

### 使用示例

```javascript
// 在 n8n Function 节点中准备 Agent 输入
const agentInput = {
  // 基本信息
  jobId: $json.job_id,
  title: $json.source_title,

  // 🆕 内容分类信息
  track: $json.track,                    // 'food'
  category: $json.category,              // 'tutorial'
  metaAttributes: $json.meta_attributes, // { title: '冰摇柠檬咖啡', ... }
  tags: $json.tags,                      // ['咖啡制作', '居家自制', ...]
  keywords: $json.keywords,              // ['咖啡', '柠檬', '冰摇', ...]

  // 完整配置
  inputContent: $json.input_content,
  stylePrompt: $json.style_prompt,
  generatedConfig: $json.generated_config,

  // 已生成图片
  images: $json.images
};
```

### Agent 提示词中的引用

```markdown
你正在为一篇 {{ category }} 类型的 {{ track }} 赛道内容生成小红书正文。

## 内容元数据
- 主题: {{ metaAttributes.title }}
- 难度: {{ metaAttributes.difficulty }}
- 时长: {{ metaAttributes.time_required }}
- 标签: {{ tags.join(', ') }}
- 关键词: {{ keywords.join(', ') }}

## 原始内容
{{ inputContent }}

## 已生成图片配置
{{ generatedConfig }}

请根据以上信息生成正文...
```

## 店铺详细信息提取

### ⚠️ 重要提示

上述查询返回的 `generated_config` 字段包含了所有店铺的详细信息，但这些信息**嵌套在 JSON 中**：

```json
{
  "generated_config": [
    {
      "index": 2,
      "type": "content",
      "title": "瞬间 Slack",
      "subtitle": "韩系马卡龙少女心空间",
      "body_points": [
        "📍 地址：深圳龙华区锦龙楼 b4 栋 301",
        "🕙 时间：建议下午茶时段",
        "🍰 必点：蓝柑冰淇淋汽水"
      ]
    }
  ]
}
```

如果你需要**直接获取结构化的店铺列表**（地址、时间、必点等字段分离），请参考：

📄 **[增强查询文档](./n8n-publish-workflow-enhanced-query.md)**

该文档提供 3 种方案：
1. **PostgreSQL CTE 查询**（推荐） - 在 SQL 层面直接提取店铺信息
2. **N8N Function 节点** - 使用 JavaScript 解析和提取
3. **独立表设计** - 长期方案，适合频繁查询

## N8N 节点配置

### PostgreSQL 节点设置

**节点类型**: Postgres
**操作**: Execute Query
**Query**: 使用上方的完整 SQL 查询

**参数说明**:
- `{{ $json.body.job_id }}`: 从 Webhook 请求体中获取任务 ID

### 输出数据结构

查询成功后，输出数据结构如下：

```json
{
  "job_id": "uuid",
  "user_id": "uuid",
  "source_url": "https://...",
  "source_title": "标题",
  "status": "completed",
  "total_images": 7,
  "completed_images": 7,

  "track": "food",
  "category": "tutorial",
  "meta_attributes": {
    "title": "冰摇柠檬咖啡",
    "difficulty": "easy",
    "time_required": "10分钟",
    "steps": 5,
    "materials_needed": ["..."],
    "suitable_for": ["..."]
  },
  "tags": ["咖啡制作", "居家自制", "夏日特调", "新手友好"],
  "keywords": ["咖啡", "柠檬", "冰摇", "居家", "自制"],

  "input_content": "原始文章内容",
  "style_prompt": "视觉风格提示词",
  "generated_config": [{...}, {...}],

  "images": [
    {
      "id": "uuid",
      "index": 1,
      "type": "cover",
      "r2_url": "https://...",
      "wechat_media_id": "media_id",
      "core_message": "冰摇柠檬咖啡",
      "text_content": "夏日清爽特调",
      "image_prompt": "...",
      "ratio": "3:4",
      "resolution": "2K"
    },
    // ... 更多图片
  ]
}
```

## 常见查询场景

### 按内容赛道筛选任务

```sql
SELECT id, source_title, track, category, tags
FROM xhs_image_jobs
WHERE track = 'food'
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 10;
```

### 按标签搜索任务

```sql
SELECT id, source_title, tags
FROM xhs_image_jobs
WHERE tags @> '["咖啡制作"]'::jsonb
  AND status = 'completed';
```

### 按关键词搜索任务

```sql
SELECT id, source_title, keywords
FROM xhs_image_jobs
WHERE keywords @> '["咖啡"]'::jsonb
  OR keywords @> '["柠檬"]'::jsonb;
```

### 查询特定元属性

```sql
-- 查询教程类任务的难度
SELECT
  id,
  source_title,
  meta_attributes->>'difficulty' AS difficulty,
  meta_attributes->>'time_required' AS time_required
FROM xhs_image_jobs
WHERE category = 'tutorial'
  AND meta_attributes->>'difficulty' = 'easy';
```

### 统计各赛道任务数量

```sql
SELECT
  track,
  category,
  COUNT(*) AS count
FROM xhs_image_jobs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY track, category
ORDER BY count DESC;
```

## 性能优化

### 索引使用

查询会自动利用以下索引：

- `idx_xhs_image_jobs_track` - B-tree 索引（track 字段）
- `idx_xhs_image_jobs_category` - B-tree 索引（category 字段）
- `idx_xhs_image_jobs_track_category` - 复合索引（track + category）
- `idx_xhs_image_jobs_tags` - GIN 索引（tags JSONB 字段）
- `idx_xhs_image_jobs_keywords` - GIN 索引（keywords JSONB 字段）
- `idx_xhs_image_jobs_meta_attributes` - GIN 索引（meta_attributes JSONB 字段）

### 查询性能

- 主键查询（WHERE id = uuid）: O(1) - 使用主键索引
- 赛道/分类查询: O(log n) - 使用 B-tree 索引
- 标签/关键词查询: O(log n) - 使用 GIN 索引
- JSONB 属性查询: O(log n) - 使用 GIN 索引

## 迁移说明

此查询需要 **Migration 0013** 已应用：

```bash
# 检查迁移状态
npm run db:studio

# 应用迁移（如果尚未应用）
npm run db:push
```

确认以下字段存在：
- `xhs_image_jobs.track`
- `xhs_image_jobs.category`
- `xhs_image_jobs.meta_attributes`
- `xhs_image_jobs.tags`
- `xhs_image_jobs.keywords`
