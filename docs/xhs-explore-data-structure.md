# 探店类型数据存储结构说明

## 数据存储位置

探店（STORE_EXPLORATION）的信息分布在 `xhs_image_jobs` 表的多个字段中：

### 1️⃣ 内容分类标识

| 字段 | 值 | 说明 |
|------|-----|------|
| `category` | `'explore'` | 内容类型：探店 |
| `track` | `'lifestyle'` | 内容赛道：生活方式 |

```sql
SELECT category, track
FROM xhs_image_jobs
WHERE category = 'explore';
-- 返回: category='explore', track='lifestyle'
```

---

### 2️⃣ 汇总级别元数据 → `meta_attributes` (JSONB)

存储所有店铺的汇总信息，**不包含单个店铺的详细地址**。

#### 数据结构

```json
{
  "location_summary": {
    "city": "深圳",                                    // 城市
    "districts": ["龙华区", "福田区", "南山区"],        // 涵盖区域
    "total_shops": 15                                   // 店铺总数
  },
  "shop_types": ["咖啡馆", "甜品店", "海景餐吧"],      // 店铺类型
  "featured_items": ["蓝柑冰淇淋汽水", "小龙猫蛋糕"],   // 代表性菜品
  "price_range": "30-80",                               // 价格区间
  "common_features": ["拍照", "网红", "周末打卡"]       // 共同特征
}
```

#### 查询示例

```sql
-- 查询深圳的探店任务
SELECT
  id,
  source_title,
  meta_attributes->'location_summary'->>'city' AS city,
  (meta_attributes->'location_summary'->>'total_shops')::int AS shop_count
FROM xhs_image_jobs
WHERE category = 'explore'
  AND meta_attributes->'location_summary'->>'city' = '深圳';
```

---

### 3️⃣ 每个店铺的详细信息 → `generated_config` (JSONB 数组)

**这里存储每个店铺的具体地址、营业时间、必点菜品！**

#### 数据结构

```json
[
  {
    "index": 1,
    "type": "cover",
    "title": "深圳必去Cafe",
    "subtitle": "15间宝藏咖啡馆合集",
    "body_points": [
      "📍 坐标：深圳",
      "☕ 涵盖：韩系/海景/复古/创新"
    ]
  },
  {
    "index": 2,
    "type": "content",                              // ← type='content' 是店铺
    "title": "瞬间 Slack",                          // ← 店铺名称
    "subtitle": "韩系马卡龙少女心空间",             // ← 推荐理由
    "body_points": [
      "📍 地址：深圳龙华区锦龙楼 b4 栋 301",       // ← body_points[0] 地址
      "🕙 时间：建议下午茶时段",                   // ← body_points[1] 营业时间
      "🍰 必点：蓝柑冰淇淋汽水"                    // ← body_points[2] 必点
    ],
    "image_prompt": "...",
    "visual_elements": ["马卡龙色家具", "粉色苏打水"],
    "color_scheme": "马卡龙粉、薄荷绿"
  },
  {
    "index": 3,
    "type": "content",
    "title": "另一家店",
    "subtitle": "...",
    "body_points": [
      "📍 地址：...",
      "🕙 时间：...",
      "🍰 必点：..."
    ]
  }
  // ... 更多店铺
]
```

#### 关键要点

| 元素 | 位置 | 说明 |
|------|------|------|
| **店铺名称** | `generated_config[n].title` | n 从 2 开始（1 是封面） |
| **推荐理由** | `generated_config[n].subtitle` | 一句话推荐 |
| **详细地址** | `generated_config[n].body_points[0]` | ⭐ 店铺地址在这里 |
| **营业时间** | `generated_config[n].body_points[1]` | 或推荐时间 |
| **必点菜品** | `generated_config[n].body_points[2]` | 推荐菜 |

#### SQL 查询单个店铺信息

```sql
-- 提取第一个店铺的详细信息（index=2，因为 index=1 是封面）
SELECT
  generated_config->1->>'title' AS shop_name,                    -- 店铺名
  generated_config->1->>'subtitle' AS subtitle,                  -- 推荐理由
  generated_config->1->'body_points'->>0 AS address,             -- 地址
  generated_config->1->'body_points'->>1 AS business_hours,      -- 时间
  generated_config->1->'body_points'->>2 AS must_try             -- 必点
FROM xhs_image_jobs
WHERE id = 'your-job-id'::uuid;
```

#### SQL 查询所有店铺列表

```sql
-- 展开所有店铺
SELECT
  config->>'title' AS shop_name,
  config->'body_points'->>0 AS address,
  config->'body_points'->>1 AS business_hours,
  config->'body_points'->>2 AS must_try
FROM xhs_image_jobs,
  jsonb_array_elements(generated_config) AS config
WHERE id = 'your-job-id'::uuid
  AND config->>'type' = 'content';  -- 只要店铺，排除封面
```

---

### 4️⃣ 标签和关键词 → `tags` & `keywords` (JSONB 数组)

用于搜索和推荐。

```json
{
  "tags": [
    "深圳咖啡",          // 地域+类型
    "韩系咖啡馆",        // 风格
    "海景咖啡",          // 特色
    "周末打卡",          // 场景
    "新店推荐"           // 特色
  ],
  "keywords": [
    "深圳",              // 城市
    "咖啡",              // 类型
    "探店",              // 动作
    "韩系",              // 风格
    "海景",              // 特色
    "周末",              // 时间
    "打卡",              // 场景
    "网红"               // 属性
  ]
}
```

#### 查询示例

```sql
-- 搜索包含"咖啡"标签的探店任务
SELECT id, source_title, tags
FROM xhs_image_jobs
WHERE category = 'explore'
  AND tags @> '["深圳咖啡"]'::jsonb;

-- 搜索关键词包含"海景"的任务
SELECT id, source_title, keywords
FROM xhs_image_jobs
WHERE category = 'explore'
  AND keywords @> '["海景"]'::jsonb;
```

---

## 完整查询示例

### 查询探店任务的所有信息

```sql
WITH shop_list AS (
  SELECT
    id,
    config->>'title' AS shop_name,
    config->'body_points'->>0 AS address,
    config->'body_points'->>1 AS business_hours,
    config->'body_points'->>2 AS must_try,
    (config->>'index')::int AS index
  FROM xhs_image_jobs,
    jsonb_array_elements(generated_config) AS config
  WHERE id = 'your-job-id'::uuid
    AND config->>'type' = 'content'
)
SELECT
  j.source_title,
  j.track,
  j.category,
  j.meta_attributes->'location_summary'->>'city' AS city,
  (j.meta_attributes->'location_summary'->>'total_shops')::int AS total_shops,
  j.tags,
  j.keywords,
  json_agg(
    json_build_object(
      'shop_name', s.shop_name,
      'address', s.address,
      'business_hours', s.business_hours,
      'must_try', s.must_try
    ) ORDER BY s.index
  ) AS shops
FROM xhs_image_jobs j
LEFT JOIN shop_list s ON s.id = j.id
WHERE j.id = 'your-job-id'::uuid
GROUP BY j.id;
```

### 输出示例

```json
{
  "source_title": "深圳必去Cafe",
  "track": "lifestyle",
  "category": "explore",
  "city": "深圳",
  "total_shops": 15,
  "tags": ["深圳咖啡", "韩系咖啡馆", "海景咖啡"],
  "keywords": ["深圳", "咖啡", "探店", "韩系"],
  "shops": [
    {
      "shop_name": "瞬间 Slack",
      "address": "📍 地址：深圳龙华区锦龙楼 b4 栋 301",
      "business_hours": "🕙 时间：建议下午茶时段",
      "must_try": "🍰 必点：蓝柑冰淇淋汽水"
    },
    {
      "shop_name": "另一家店",
      "address": "...",
      "business_hours": "...",
      "must_try": "..."
    }
  ]
}
```

---

## 数据流向

### 创建任务时（N8N Code 节点）

```javascript
// Agent 输出的数据
const agentOutput = {
  task_metadata: {
    track: "lifestyle",
    category: "explore",
    meta_attributes: {
      location_summary: { city: "深圳", total_shops: 15 },
      // ...
    },
    tags: ["深圳咖啡", ...],
    keywords: ["深圳", "咖啡", ...]
  },
  images: [
    { type: "cover", title: "...", body_points: [...] },
    { type: "content", title: "瞬间 Slack", body_points: ["📍 地址：...", ...] },
    // ...
  ]
};

// 插入数据库
INSERT INTO xhs_image_jobs (
  track,                      // ← 从 task_metadata.track
  category,                   // ← 从 task_metadata.category
  meta_attributes,            // ← 从 task_metadata.meta_attributes (汇总信息)
  tags,                       // ← 从 task_metadata.tags
  keywords,                   // ← 从 task_metadata.keywords
  generated_config            // ← 从 images 数组 (包含每个店铺详情)
)
VALUES (
  'lifestyle',
  'explore',
  '{"location_summary": {...}}'::jsonb,
  '["深圳咖啡", ...]'::jsonb,
  '["深圳", "咖啡", ...]'::jsonb,
  '[{"index": 1, ...}, {"index": 2, "title": "瞬间 Slack", ...}]'::jsonb
);
```

---

## 总结

### 探店数据分布

| 数据类型 | 存储字段 | 数据格式 | 用途 |
|---------|---------|---------|------|
| **内容类型** | `category` | `'explore'` | 标识是探店内容 |
| **内容赛道** | `track` | `'lifestyle'` | 分类到生活方式 |
| **汇总信息** | `meta_attributes` | JSONB 对象 | 城市、总店数、价格区间等 |
| **店铺详情** | `generated_config` | JSONB 数组 | ⭐ 每个店铺的地址/时间/必点 |
| **搜索标签** | `tags` | JSONB 数组 | 用于搜索和推荐 |
| **SEO 关键词** | `keywords` | JSONB 数组 | 用于搜索优化 |

### 关键要点

1. **店铺地址在 `generated_config` 里**：
   - 每个 `type='content'` 的对象代表一个店铺
   - 地址在 `body_points[0]`
   - 时间在 `body_points[1]`
   - 必点在 `body_points[2]`

2. **`meta_attributes` 只有汇总信息**：
   - 不包含具体店铺地址
   - 只有城市、区域、总店数等

3. **查询时需要展开 JSONB 数组**：
   - 使用 `jsonb_array_elements(generated_config)`
   - 或使用完整查询（见 `n8n-publish-workflow-complete-query.md`）

### 推荐查询

使用完整查询文档中的 SQL：
📄 `/docs/n8n-publish-workflow-complete-query.md`

该查询会返回：
- `shops` 数组：已提取的店铺列表（包含 point_1/point_2/point_3）
- `generated_config` 原始数组：完整 JSON 配置
- 所有分类和元数据字段
