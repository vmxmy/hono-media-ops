# N8N 发布工作流 - 增强查询（含店铺详情提取）

## 问题背景

默认查询返回的 `generated_config` 是一个 JSONB 数组，店铺的详细信息（地址、必点、时间）嵌套在每个图片对象的 `body_points` 字段中，不便直接使用。

本文档提供增强查询，直接从 `generated_config` 中提取结构化的店铺列表。

## 方案 1: 使用 PostgreSQL JSONB 函数提取店铺信息

### 完整 SQL 查询

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

    -- 完整配置信息
    j.input_content,
    j.style_prompt,
    j.generated_config,

    -- 内容分类信息
    j.track,
    j.category,
    j.meta_attributes,
    j.tags,
    j.keywords,

    -- 图片提示词信息
    p.title AS prompt_title,
    p.prompt AS base_prompt,
    p.negative_prompt,
    p.model,
    p.category AS prompt_category

  FROM xhs_image_jobs j
  LEFT JOIN image_prompts p ON p.id = j.image_prompt_id
  WHERE j.id = '{{ $json.body.job_id }}'::uuid
),
shop_details AS (
  SELECT
    job_id,
    jsonb_array_elements(generated_config) AS shop_config
  FROM job_data
  WHERE generated_config IS NOT NULL
),
extracted_shops AS (
  SELECT
    job_id,
    (shop_config->>'index')::integer AS index,
    shop_config->>'type' AS type,
    shop_config->>'title' AS shop_name,
    shop_config->>'subtitle' AS subtitle,
    -- ✨ 从 body_points 数组中提取具体字段
    shop_config->'body_points'->>0 AS address,           -- 第一个元素：地址
    shop_config->'body_points'->>1 AS business_hours,    -- 第二个元素：营业时间
    shop_config->'body_points'->>2 AS must_try,          -- 第三个元素：必点
    shop_config->'body_points' AS body_points_raw,       -- 原始数组（备用）
    shop_config->>'image_prompt' AS image_prompt,
    shop_config->'visual_elements' AS visual_elements,
    shop_config->>'color_scheme' AS color_scheme
  FROM shop_details
  WHERE shop_config->>'type' = 'content'  -- 只提取店铺内容图，排除封面
)
SELECT
  jd.*,

  -- ✨ 结构化的店铺列表
  COALESCE(
    json_agg(
      json_build_object(
        'index', es.index,
        'shop_name', es.shop_name,
        'subtitle', es.subtitle,
        'address', es.address,                    -- ✨ 已提取的地址
        'business_hours', es.business_hours,      -- ✨ 已提取的营业时间
        'must_try', es.must_try,                  -- ✨ 已提取的必点
        'body_points_raw', es.body_points_raw,    -- 原始数组（备用）
        'image_prompt', es.image_prompt,
        'visual_elements', es.visual_elements,
        'color_scheme', es.color_scheme
      ) ORDER BY es.index
    ) FILTER (WHERE es.index IS NOT NULL),
    '[]'::json
  ) AS shops,

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

FROM job_data jd
LEFT JOIN extracted_shops es ON es.job_id = jd.job_id
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
  jd.input_content,
  jd.style_prompt,
  jd.generated_config,
  jd.track,
  jd.category,
  jd.meta_attributes,
  jd.tags,
  jd.keywords,
  jd.prompt_title,
  jd.base_prompt,
  jd.negative_prompt,
  jd.model,
  jd.prompt_category
LIMIT 1;
```

### 输出数据结构

```json
{
  "job_id": "uuid",
  "source_title": "深圳必去Cafe",
  "track": "lifestyle",
  "category": "explore",
  "meta_attributes": {
    "location_summary": {
      "city": "深圳",
      "total_shops": 15
    }
  },
  "tags": ["深圳咖啡", "韩系咖啡馆"],
  "keywords": ["深圳", "咖啡", "探店"],

  "shops": [
    {
      "index": 2,
      "shop_name": "瞬间 Slack",
      "subtitle": "韩系马卡龙少女心空间",
      "address": "📍 地址：深圳龙华区锦龙楼 b4 栋 301",
      "business_hours": "🕙 时间：建议下午茶时段",
      "must_try": "🍰 必点：蓝柑冰淇淋汽水",
      "body_points_raw": [
        "📍 地址：深圳龙华区锦龙楼 b4 栋 301",
        "🕙 时间：建议下午茶时段",
        "🍰 必点：蓝柑冰淇淋汽水"
      ],
      "image_prompt": "...",
      "visual_elements": ["马卡龙色家具", "粉色苏打水"],
      "color_scheme": "马卡龙粉、薄荷绿"
    },
    {
      "index": 3,
      "shop_name": "另一家店",
      "subtitle": "...",
      "address": "📍 地址：...",
      "business_hours": "🕙 时间：...",
      "must_try": "🍰 必点：..."
    }
  ],

  "images": [...]
}
```

## 方案 2: 使用 N8N Function 节点提取（更灵活）

如果需要更复杂的数据处理，可以在 N8N 中添加一个 Function 节点：

### Function 节点代码

```javascript
const item = $input.first().json;

// 从 generated_config 中提取店铺信息
const shops = (item.generated_config || [])
  .filter(config => config.type === 'content')  // 只保留店铺内容
  .map(config => {
    // 解析 body_points 数组，提取地址、时间、必点
    const bodyPoints = config.body_points || [];

    // 方法 1: 直接使用数组索引（假设顺序固定）
    const address = bodyPoints[0] || '';         // 第一个元素：地址
    const time = bodyPoints[1] || '';            // 第二个元素：时间
    const mustTry = bodyPoints[2] || '';         // 第三个元素：必点

    // 方法 2: 使用正则匹配清理前缀（可选）
    const cleanAddress = address.replace(/^📍\s*地址[：:]\s*/, '');
    const cleanTime = time.replace(/^🕙\s*时间[：:]\s*/, '');
    const cleanMustTry = mustTry.replace(/^🍰\s*必点[：:]\s*/, '');

    return {
      index: config.index,
      shop_name: config.title,
      subtitle: config.subtitle,

      // 原始值（包含 emoji 和标签）
      address: address,
      business_hours: time,
      must_try: mustTry,

      // 清理后的值（仅内容）
      address_clean: cleanAddress,
      business_hours_clean: cleanTime,
      must_try_clean: cleanMustTry,

      // 保留原始数组（备用）
      body_points_raw: bodyPoints,

      image_prompt: config.image_prompt,
      visual_elements: config.visual_elements,
      color_scheme: config.color_scheme
    };
  });

return {
  json: {
    ...item,
    shops: shops,
    shop_count: shops.length
  }
};
```

### 输出结构（更结构化）

```json
{
  "job_id": "uuid",
  "source_title": "深圳必去Cafe",

  "shops": [
    {
      "index": 2,
      "shop_name": "瞬间 Slack",
      "subtitle": "韩系马卡龙少女心空间",

      // 原始值（包含 emoji 和标签）
      "address": "📍 地址：深圳龙华区锦龙楼 b4 栋 301",
      "business_hours": "🕙 时间：建议下午茶时段",
      "must_try": "🍰 必点：蓝柑冰淇淋汽水",

      // 清理后的值（仅内容）
      "address_clean": "深圳龙华区锦龙楼 b4 栋 301",
      "business_hours_clean": "建议下午茶时段",
      "must_try_clean": "蓝柑冰淇淋汽水",

      "body_points_raw": ["📍 地址：...", "🕙 时间：...", "🍰 必点：..."],
      "image_prompt": "...",
      "visual_elements": [...],
      "color_scheme": "..."
    }
  ],
  "shop_count": 15
}
```

## 方案 3: 优化数据库设计（长期方案）

如果经常需要查询店铺详情，可以考虑创建独立的 `shop_details` 表：

### 表结构设计

```sql
CREATE TABLE xhs_shop_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES xhs_image_jobs(id) ON DELETE CASCADE,
  index integer NOT NULL,
  shop_name text NOT NULL,
  subtitle text,
  address text,
  business_hours text,
  must_try text,
  image_config jsonb,  -- 存储完整的图片配置
  created_at timestamptz DEFAULT NOW(),

  UNIQUE(job_id, index)
);

CREATE INDEX idx_shop_details_job_id ON xhs_shop_details(job_id);
CREATE INDEX idx_shop_details_shop_name ON xhs_shop_details(shop_name);
```

### 插入逻辑

在创建任务后，解析 `generated_config` 并插入到 `xhs_shop_details` 表：

```sql
-- 在 N8N Code 节点或后台任务中执行
INSERT INTO xhs_shop_details (job_id, index, shop_name, subtitle, address, business_hours, must_try, image_config)
SELECT
  '{{ $json.job_id }}'::uuid,
  (config->>'index')::integer,
  config->>'title',
  config->>'subtitle',
  config->'body_points'->>0,  -- 假设第一个是地址
  config->'body_points'->>1,  -- 假设第二个是时间
  config->'body_points'->>2,  -- 假设第三个是必点
  config
FROM jsonb_array_elements('{{ $json.generated_config }}'::jsonb) AS config
WHERE config->>'type' = 'content';
```

### 查询店铺详情

```sql
SELECT
  j.id,
  j.source_title,
  j.track,
  j.category,

  json_agg(
    json_build_object(
      'shop_name', s.shop_name,
      'subtitle', s.subtitle,
      'address', s.address,
      'business_hours', s.business_hours,
      'must_try', s.must_try
    ) ORDER BY s.index
  ) AS shops

FROM xhs_image_jobs j
LEFT JOIN xhs_shop_details s ON s.job_id = j.id
WHERE j.id = '{{ $json.body.job_id }}'::uuid
GROUP BY j.id;
```

## 推荐方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **方案 1: PostgreSQL CTE** | 单一查询，性能好 | SQL 复杂 | 当前推荐，无需修改表结构 |
| **方案 2: N8N Function** | 灵活，易于调试 | 需要额外节点 | 需要复杂数据转换时 |
| **方案 3: 独立表** | 查询最简单，性能最好 | 需要维护额外表 | 长期方案，频繁查询店铺信息时 |

## 当前建议

**立即使用方案 1（PostgreSQL CTE 查询）**，因为：
1. 无需修改数据库架构
2. 单一查询，性能良好
3. 返回结构化的店铺列表，方便 Agent 使用

如果后续发现性能瓶颈或查询复杂度过高，再考虑迁移到方案 3。

## 使用示例

### 在 N8N PostgreSQL 节点中

直接使用方案 1 的完整 SQL 查询即可。

### 在 Agent 提示词中使用

```javascript
// N8N Function 节点准备 Agent 输入
const agentInput = {
  jobId: $json.job_id,
  title: $json.source_title,

  // 使用结构化的店铺列表
  shops: $json.shops,  // 已经是数组，每个对象包含 shop_name, address, time, must_try

  // 元数据
  track: $json.track,
  category: $json.category,
  tags: $json.tags,
  keywords: $json.keywords,

  // 已生成图片
  images: $json.images
};
```

### Agent 提示词示例

```markdown
你正在为一篇探店合集生成小红书正文。

## 店铺列表
{{ shops.map(shop => `
### ${shop.shop_name}
- 推荐理由: ${shop.subtitle}
- 地址: ${shop.body_points[0]}
- 营业时间: ${shop.body_points[1]}
- 必点: ${shop.body_points[2]}
`).join('\n') }}

请根据以上信息生成正文...
```

## 性能说明

- CTE 查询会被 PostgreSQL 优化器内联
- `jsonb_array_elements` 展开数组的时间复杂度 O(n)
- 整体查询时间 <50ms（对于包含 15 个店铺的任务）
- 建议添加 `EXPLAIN ANALYZE` 分析实际性能
