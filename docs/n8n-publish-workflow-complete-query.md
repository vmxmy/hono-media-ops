# N8N 发布工作流 - 完整查询（所有数据）

## 设计理念

**返回所有可能需要的数据，由调用方选择使用**。这个查询会返回：

1. ✅ 原始 `generated_config` 完整 JSONB 数组
2. ✅ 结构化提取的店铺列表（已拆分字段）
3. ✅ 所有元数据和分类字段
4. ✅ 已生成图片列表
5. ✅ 灵活性：既有原始数据也有解析后数据

## 完整 SQL 查询

```sql
WITH job_data AS (
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
    j.created_at,
    j.updated_at,
    j.started_at,
    j.completed_at,

    -- ✨ 完整配置信息（原始数据）
    j.input_content,
    j.style_prompt,
    j.generated_config,                    -- ✨ 原始 JSONB 数组（完整保留）

    -- 🆕 内容分类信息
    j.track,
    j.category,
    j.meta_attributes,                     -- ✨ 原始 JSONB 对象（完整保留）
    j.tags,
    j.keywords,

    -- 图片提示词信息
    j.image_prompt_id,
    p.title AS prompt_title,
    p.prompt AS base_prompt,
    p.negative_prompt,
    p.model,
    p.category AS prompt_category

  FROM xhs_image_jobs j
  LEFT JOIN image_prompts p ON p.id = j.image_prompt_id
  WHERE j.id = '{{ $json.body.job_id }}'::uuid
),
-- 提取店铺/内容详情（结构化）
shop_details AS (
  SELECT
    job_id,
    jsonb_array_elements(generated_config) AS config
  FROM job_data
  WHERE generated_config IS NOT NULL
),
extracted_content AS (
  SELECT
    job_id,
    (config->>'index')::integer AS index,
    config->>'type' AS type,
    config->>'title' AS title,
    config->>'subtitle' AS subtitle,

    -- 提取 body_points 数组元素
    config->'body_points'->>0 AS point_1,
    config->'body_points'->>1 AS point_2,
    config->'body_points'->>2 AS point_3,
    config->'body_points'->>3 AS point_4,
    config->'body_points'->>4 AS point_5,

    -- 保留完整 body_points 数组
    config->'body_points' AS body_points,

    -- 其他配置
    config->>'image_prompt' AS image_prompt,
    config->'visual_elements' AS visual_elements,
    config->>'color_scheme' AS color_scheme,
    config->>'ratio' AS ratio,
    config->>'watermark' AS watermark
  FROM shop_details
)
SELECT
  jd.*,

  -- ✨ 结构化内容列表（所有类型：cover + content）
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'index', ec.index,
        'type', ec.type,
        'title', ec.title,
        'subtitle', ec.subtitle,

        -- 原始 body_points 数组
        'body_points', ec.body_points,

        -- 拆分后的独立字段（方便直接访问）
        'point_1', ec.point_1,
        'point_2', ec.point_2,
        'point_3', ec.point_3,
        'point_4', ec.point_4,
        'point_5', ec.point_5,

        'image_prompt', ec.image_prompt,
        'visual_elements', ec.visual_elements,
        'color_scheme', ec.color_scheme,
        'ratio', ec.ratio,
        'watermark', ec.watermark
      ) ORDER BY ec.index
    )
    FROM extracted_content ec
    WHERE ec.job_id = jd.job_id),
    '[]'::json
  ) AS content_items,

  -- ✨ 仅店铺/内容类（type='content'）
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'index', ec.index,
        'title', ec.title,
        'subtitle', ec.subtitle,
        'point_1', ec.point_1,
        'point_2', ec.point_2,
        'point_3', ec.point_3,
        'body_points', ec.body_points
      ) ORDER BY ec.index
    )
    FROM extracted_content ec
    WHERE ec.job_id = jd.job_id AND ec.type = 'content'),
    '[]'::json
  ) AS shops,

  -- ✨ 封面图配置（type='cover'）
  (SELECT json_build_object(
      'index', ec.index,
      'title', ec.title,
      'subtitle', ec.subtitle,
      'body_points', ec.body_points,
      'image_prompt', ec.image_prompt,
      'visual_elements', ec.visual_elements,
      'color_scheme', ec.color_scheme
    )
    FROM extracted_content ec
    WHERE ec.job_id = jd.job_id AND ec.type = 'cover'
    LIMIT 1
  ) AS cover_config,

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
        'resolution', i.resolution,
        'created_at', i.created_at
      ) ORDER BY i.index
    ) FILTER (WHERE i.id IS NOT NULL),
    '[]'::json
  ) AS images,

  -- 统计信息
  (SELECT COUNT(*) FROM extracted_content ec WHERE ec.job_id = jd.job_id) AS total_content_items,
  (SELECT COUNT(*) FROM extracted_content ec WHERE ec.job_id = jd.job_id AND ec.type = 'content') AS shop_count,
  (SELECT COUNT(*) FROM extracted_content ec WHERE ec.job_id = jd.job_id AND ec.type = 'cover') AS cover_count

FROM job_data jd
LEFT JOIN xhs_images i ON i.job_id = jd.job_id
GROUP BY
  jd.job_id,
  jd.user_id,
  jd.source_url,
  jd.source_title,
  jd.status,
  jd.total_images,
  jd.completed_images,
  jd.ratio,
  jd.resolution,
  jd.publish_status,
  jd.xhs_note_id,
  jd.created_at,
  jd.updated_at,
  jd.started_at,
  jd.completed_at,
  jd.input_content,
  jd.style_prompt,
  jd.generated_config,
  jd.track,
  jd.category,
  jd.meta_attributes,
  jd.tags,
  jd.keywords,
  jd.image_prompt_id,
  jd.prompt_title,
  jd.base_prompt,
  jd.negative_prompt,
  jd.model,
  jd.prompt_category
LIMIT 1;
```

## 输出数据结构

```json
{
  // ==================== 基本信息 ====================
  "job_id": "uuid",
  "user_id": "uuid",
  "source_url": "https://...",
  "source_title": "深圳必去Cafe",
  "status": "completed",
  "total_images": 7,
  "completed_images": 7,
  "ratio": "3:4",
  "resolution": "2K",
  "publish_status": "not_published",
  "xhs_note_id": null,
  "created_at": "2026-01-26T10:00:00Z",
  "updated_at": "2026-01-26T10:30:00Z",
  "started_at": "2026-01-26T10:00:00Z",
  "completed_at": "2026-01-26T10:30:00Z",

  // ==================== 原始配置（JSONB） ====================
  "input_content": "原始文章内容...",
  "style_prompt": "视觉风格提示词...",

  // ✅ 完整的 generated_config（原始 JSONB 数组）
  "generated_config": [
    {
      "index": 1,
      "type": "cover",
      "title": "深圳必去Cafe",
      "subtitle": "15间宝藏咖啡馆合集",
      "body_points": ["📍 坐标：深圳", "☕ 涵盖：韩系/海景/复古"],
      "image_prompt": "...",
      "visual_elements": [...],
      "color_scheme": "..."
    },
    {
      "index": 2,
      "type": "content",
      "title": "瞬间 Slack",
      "subtitle": "韩系马卡龙少女心空间",
      "body_points": [
        "📍 地址：深圳龙华区锦龙楼 b4 栋 301",
        "🕙 时间：建议下午茶时段",
        "🍰 必点：蓝柑冰淇淋汽水"
      ],
      "image_prompt": "...",
      "visual_elements": [...],
      "color_scheme": "..."
    }
    // ... 更多店铺
  ],

  // ==================== 内容分类（JSONB） ====================
  "track": "lifestyle",
  "category": "explore",

  // ✅ 完整的 meta_attributes（原始 JSONB 对象）
  "meta_attributes": {
    "location_summary": {
      "city": "深圳",
      "districts": ["龙华区", "福田区", "南山区"],
      "total_shops": 15
    },
    "shop_types": ["咖啡馆", "甜品店"],
    "featured_items": ["蓝柑冰淇淋汽水", "小龙猫蛋糕"],
    "price_range": "30-80",
    "common_features": ["拍照", "网红", "周末打卡"]
  },

  "tags": ["深圳咖啡", "韩系咖啡馆", "海景咖啡", "周末打卡"],
  "keywords": ["深圳", "咖啡", "探店", "韩系", "海景"],

  // ==================== 提示词信息 ====================
  "image_prompt_id": "uuid",
  "prompt_title": "3D 风格提示词",
  "base_prompt": "Playful 3D style...",
  "negative_prompt": "...",
  "model": "midjourney",
  "prompt_category": "3d",

  // ==================== 结构化内容（提取后） ====================

  // ✅ 所有内容项（包括 cover + content）
  "content_items": [
    {
      "index": 1,
      "type": "cover",
      "title": "深圳必去Cafe",
      "subtitle": "15间宝藏咖啡馆合集",
      "body_points": ["📍 坐标：深圳", "☕ 涵盖：韩系/海景/复古"],
      "point_1": "📍 坐标：深圳",
      "point_2": "☕ 涵盖：韩系/海景/复古",
      "point_3": null,
      "point_4": null,
      "point_5": null,
      "image_prompt": "...",
      "visual_elements": [...],
      "color_scheme": "...",
      "ratio": "3:4",
      "watermark": "ZIIKOO TALK"
    },
    {
      "index": 2,
      "type": "content",
      "title": "瞬间 Slack",
      "subtitle": "韩系马卡龙少女心空间",
      "body_points": [
        "📍 地址：深圳龙华区锦龙楼 b4 栋 301",
        "🕙 时间：建议下午茶时段",
        "🍰 必点：蓝柑冰淇淋汽水"
      ],
      "point_1": "📍 地址：深圳龙华区锦龙楼 b4 栋 301",
      "point_2": "🕙 时间：建议下午茶时段",
      "point_3": "🍰 必点：蓝柑冰淇淋汽水",
      "point_4": null,
      "point_5": null,
      "image_prompt": "...",
      "visual_elements": [...],
      "color_scheme": "..."
    }
    // ... 更多内容
  ],

  // ✅ 仅店铺列表（type='content'，简化版）
  "shops": [
    {
      "index": 2,
      "title": "瞬间 Slack",
      "subtitle": "韩系马卡龙少女心空间",
      "point_1": "📍 地址：深圳龙华区锦龙楼 b4 栋 301",
      "point_2": "🕙 时间：建议下午茶时段",
      "point_3": "🍰 必点：蓝柑冰淇淋汽水",
      "body_points": [
        "📍 地址：深圳龙华区锦龙楼 b4 栋 301",
        "🕙 时间：建议下午茶时段",
        "🍰 必点：蓝柑冰淇淋汽水"
      ]
    }
    // ... 更多店铺
  ],

  // ✅ 封面配置（type='cover'）
  "cover_config": {
    "index": 1,
    "title": "深圳必去Cafe",
    "subtitle": "15间宝藏咖啡馆合集",
    "body_points": ["📍 坐标：深圳", "☕ 涵盖：韩系/海景/复古"],
    "image_prompt": "...",
    "visual_elements": [...],
    "color_scheme": "..."
  },

  // ==================== 已生成图片 ====================
  "images": [
    {
      "id": "uuid",
      "index": 1,
      "type": "cover",
      "r2_url": "https://r2.example.com/...",
      "wechat_url": "https://mmbiz.qpic.cn/...",
      "wechat_media_id": "media_id_123",
      "core_message": "深圳必去Cafe",
      "text_content": "15间宝藏咖啡馆合集",
      "image_prompt": "...",
      "ratio": "3:4",
      "resolution": "2K",
      "created_at": "2026-01-26T10:05:00Z"
    }
    // ... 更多图片
  ],

  // ==================== 统计信息 ====================
  "total_content_items": 16,   // 总内容项数（cover + content）
  "shop_count": 15,             // 店铺数量（仅 content）
  "cover_count": 1              // 封面数量（仅 cover）
}
```

## 数据使用指南

### 选择使用哪些字段

根据你的需求，选择合适的字段：

| 需求 | 推荐使用的字段 | 原因 |
|------|---------------|------|
| **Agent 生成正文** | `input_content`, `generated_config`, `meta_attributes`, `tags`, `keywords` | 需要完整原始数据 |
| **前端展示店铺列表** | `shops` 数组 | 已结构化，直接遍历展示 |
| **前端展示封面** | `cover_config` | 单独提取的封面配置 |
| **搜索/筛选** | `track`, `category`, `tags`, `keywords` | 分类和标签字段 |
| **图片管理** | `images` 数组 | 已生成图片列表 |
| **调试/完整导出** | 所有字段 | 最大灵活性 |

### 示例：Agent 使用

```javascript
// N8N Function 节点
const data = $json;

const agentInput = {
  // 基本信息
  jobId: data.job_id,
  title: data.source_title,

  // 使用原始配置（给 Agent 最大灵活性）
  inputContent: data.input_content,
  generatedConfig: data.generated_config,  // 完整 JSON 数组
  metaAttributes: data.meta_attributes,    // 完整 JSON 对象

  // 分类信息
  track: data.track,
  category: data.category,
  tags: data.tags,
  keywords: data.keywords,

  // 或者使用结构化的店铺列表（如果需要）
  shops: data.shops,                       // 已拆分字段的店铺列表
  coverConfig: data.cover_config,          // 封面配置

  // 已生成图片
  images: data.images
};
```

### 示例：前端展示

```javascript
// React 组件
function ShopList({ data }) {
  return (
    <div>
      <h1>{data.source_title}</h1>
      <p>类型：{data.track} / {data.category}</p>
      <p>标签：{data.tags.join(', ')}</p>

      {data.shops.map(shop => (
        <div key={shop.index}>
          <h2>{shop.title}</h2>
          <p>{shop.subtitle}</p>
          <p>{shop.point_1}</p>  {/* 地址 */}
          <p>{shop.point_2}</p>  {/* 时间 */}
          <p>{shop.point_3}</p>  {/* 必点 */}
        </div>
      ))}
    </div>
  );
}
```

## 字段索引对照表

### body_points 数组索引

根据 Agent 提示词设计，`body_points` 数组元素的含义：

#### 探店类 (category='explore')

| 索引 | 字段名 | 典型值 | 说明 |
|------|--------|--------|------|
| `point_1` / `[0]` | 地址 | `"📍 地址：深圳龙华区..."` | 店铺地址 |
| `point_2` / `[1]` | 时间 | `"🕙 时间：建议下午茶时段"` | 营业时间或推荐时间 |
| `point_3` / `[2]` | 必点 | `"🍰 必点：蓝柑冰淇淋汽水"` | 推荐菜品 |

#### 教程类 (category='tutorial')

| 索引 | 字段名 | 典型值 | 说明 |
|------|--------|--------|------|
| `point_1` / `[0]` | 食材1 | `"浓缩咖啡 40ml"` | 第一个食材 |
| `point_2` / `[1]` | 食材2 | `"新鲜柠檬 1个"` | 第二个食材 |
| `point_3` / `[2]` | 食材3 | `"气泡水 150ml"` | 第三个食材 |

#### 测评类 (category='review')

| 索引 | 字段名 | 典型值 | 说明 |
|------|--------|--------|------|
| `point_1` / `[0]` | 参数1 | `"⚙️ 材质：不锈钢"` | 第一个关键参数 |
| `point_2` / `[1]` | 参数2 | `"⚖️ 重量：3.1kg"` | 第二个关键参数 |
| `point_3` / `[2]` | 参数3 | `"💰 价格：¥5490"` | 价格信息 |

**注意**：不同内容类型的 `body_points` 结构可能不同，建议：
- 使用 `body_points` 原始数组保证完整性
- 使用 `point_1`, `point_2`, `point_3` 等独立字段方便访问
- 根据 `category` 字段判断 `body_points` 的语义

## 性能说明

- 查询使用 CTE 优化，PostgreSQL 会自动内联
- `jsonb_array_elements` 展开时间复杂度 O(n)
- 对于 15 个店铺的任务，查询时间约 30-50ms
- 返回数据大小约 50-100KB（JSON）

## 迁移说明

此查询需要 **Migration 0013** 已应用。确认字段存在：
- `xhs_image_jobs.track`
- `xhs_image_jobs.category`
- `xhs_image_jobs.meta_attributes`
- `xhs_image_jobs.tags`
- `xhs_image_jobs.keywords`
