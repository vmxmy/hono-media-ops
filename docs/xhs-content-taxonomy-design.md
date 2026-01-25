# 小红书内容分类与属性体系设计

## 概述

设计一套完整的内容分类体系，从赛道（Track）→ 类型（Category）→ 风格（Style）→ 元属性（Meta），支持精准的内容定位和个性化推荐。

---

## 1. 赛道（Track）- 一级分类

赛道是最顶层的内容领域划分，决定了内容的核心受众和商业价值。

| 赛道代码 | 赛道名称 | 描述 | 典型受众 |
|---------|---------|------|---------|
| `lifestyle` | 生活方式 | 美食、咖啡、探店、home decor | 都市白领、精致生活追求者 |
| `beauty` | 美妆个护 | 护肤、彩妆、发型、香水 | 女性为主，18-35岁 |
| `fashion` | 时尚穿搭 | 服装、配饰、穿搭教程 | 时尚敏感人群 |
| `travel` | 旅行出游 | 目的地攻略、酒店民宿、景点 | 旅游爱好者 |
| `food` | 美食烹饪 | 食谱、烘焙、餐厅推荐 | 美食爱好者 |
| `home` | 家居家装 | 装修、收纳、家电、软装 | 有房一族、新婚夫妇 |
| `parenting` | 母婴育儿 | 孕期、育儿、早教、玩具 | 准妈妈、0-6岁父母 |
| `fitness` | 健身运动 | 健身、瑜伽、跑步、减脂 | 健身爱好者 |
| `education` | 知识学习 | 技能、考证、语言、读书 | 学生、职场人 |
| `tech` | 数码科技 | 手机、电脑、智能家居 | 科技爱好者 |
| `pets` | 萌宠 | 养宠、宠物用品、训练 | 宠物主人 |
| `finance` | 理财投资 | 理财、基金、保险、省钱 | 理财意识人群 |

---

## 2. 内容类型（Category）- 二级分类

内容类型定义了内容的呈现形式和创作目的。

| 类型代码 | 类型名称 | 描述 | 适用赛道 | 特点 |
|---------|---------|------|---------|------|
| `explore` | 探店/探访 | 实地探访、体验分享 | lifestyle, food, travel | 强场景、重氛围 |
| `review` | 测评/评测 | 产品横评、深度测试 | beauty, tech, home | 数据详实、对比清晰 |
| `tutorial` | 教程/攻略 | 步骤教学、操作指南 | beauty, food, education | 结构化、可复制 |
| `knowledge` | 干货科普 | 知识分享、原理解析 | education, finance, fitness | 信息密度高 |
| `recommendation` | 种草推荐 | 好物分享、清单推荐 | 全赛道通用 | 强转化、带货属性 |
| `lifestyle_vlog` | 生活记录 | 日常vlog、随手拍 | lifestyle, travel, pets | 真实、轻松 |
| `comparison` | 对比选购 | A vs B、选购指南 | beauty, tech, home | 决策辅助 |
| `collection` | 合集/榜单 | Top N、盘点 | 全赛道通用 | 信息整合 |
| `diy` | DIY/手工 | 手作、改造、创意 | home, food, fashion | 创意、动手 |
| `case_study` | 案例分享 | 成功案例、改造前后 | home, fashion, fitness | 视觉冲击 |

---

## 3. 内容风格（Style）- 三级分类

风格定义了内容的调性、叙事方式和情感表达。

### 3.1 视觉风格

| 风格代码 | 风格名称 | 特点 | 适用场景 |
|---------|---------|------|---------|
| `minimalist` | 极简风 | 留白多、色彩少、构图简洁 | 家居、时尚、产品 |
| `dopamine` | 多巴胺风 | 高饱和色、活力、快乐 | 探店、美食、穿搭 |
| `vintage` | 复古风 | 怀旧色调、胶片质感 | 咖啡馆、旅行、穿搭 |
| `natural` | 自然风 | 绿植、木质、温暖 | 家居、咖啡、生活 |
| `modern` | 现代简约 | 线条感、几何、冷色 | 科技、家居、办公 |
| `kawaii` | 可爱卡通 | 卡通元素、粉嫩色 | 美���、探店、母婴 |
| `luxury` | 高级感 | 低饱和、质感、克制 | 时尚、美妆、酒店 |

### 3.2 文案风格

| 风格代码 | 风格名称 | 特点 | 适用场景 |
|---------|---------|------|---------|
| `casual` | 口语化 | 聊天感、接地气、emoji多 | 日常分享、vlog |
| `professional` | 专业严谨 | 术语准确、逻辑清晰 | 科普、教程、测评 |
| `storytelling` | 故事叙事 | 有情节、有起伏 | 旅行、探店、案例 |
| `listicle` | 清单式 | 结构化、要点明确 | 合集、攻略、榜单 |
| `humorous` | 幽默搞笑 | 段子、梗、反转 | 生活、吐槽、对比 |
| `emotional` | 情感共鸣 | 走心、共情、治愈 | 生活、宠物、育儿 |

---

## 4. 元属性（Meta Attributes）

根据不同赛道和类型，定义常用的结构化属性。

### 4.1 探店类（explore）

```json
{
  "track": "lifestyle",
  "category": "explore",
  "visual_style": "dopamine",
  "text_style": "casual",

  "meta": {
    "shop_name": "瞬间 Slack",
    "shop_type": "咖啡馆",
    "address": "深圳龙华区锦龙楼 b4 栋 301",
    "opening_date": "2024-09",
    "price_range": "30-60",
    "must_try": ["蓝柑冰淇淋汽水", "橙汁一夏"],
    "tags": ["韩系", "马卡龙", "拍照", "新店"],
    "best_time": "下午茶时段",
    "transportation": "地铁X号线XX站",
    "reservation_required": false,
    "pet_friendly": true,
    "parking_available": false
  }
}
```

### 4.2 测评类（review）

```json
{
  "track": "beauty",
  "category": "review",
  "visual_style": "modern",
  "text_style": "professional",

  "meta": {
    "product_name": "雅诗兰黛小棕瓶",
    "brand": "Estée Lauder",
    "price": 780,
    "capacity": "50ml",
    "rating": 4.5,
    "pros": ["吸收快", "提亮", "修护"],
    "cons": ["价格贵", "香味重"],
    "skin_type": ["干皮", "混合皮"],
    "usage_duration": "30天",
    "repurchase": true,
    "alternatives": ["兰蔻小黑瓶", "SK-II神仙水"]
  }
}
```

### 4.3 教程类（tutorial）

```json
{
  "track": "beauty",
  "category": "tutorial",
  "visual_style": "minimalist",
  "text_style": "listicle",

  "meta": {
    "title": "日常通勤妆教程",
    "difficulty": "easy",
    "time_required": "15分钟",
    "steps": 7,
    "products_needed": ["粉底液", "眼影盘", "口红"],
    "suitable_for": ["新手", "学生党"],
    "occasion": ["上班", "约会", "日常"],
    "season": ["四季通用"]
  }
}
```

### 4.4 干货科普类（knowledge）

```json
{
  "track": "fitness",
  "category": "knowledge",
  "visual_style": "modern",
  "text_style": "professional",

  "meta": {
    "topic": "HIIT训练原理",
    "knowledge_depth": "intermediate",
    "reading_time": "5分钟",
    "key_points": ["什么是HIIT", "燃脂原理", "训练方案"],
    "references": ["论文链接", "书籍"],
    "difficulty": "medium",
    "target_audience": ["健身爱好者", "减脂人群"]
  }
}
```

### 4.5 种草推荐类（recommendation）

```json
{
  "track": "home",
  "category": "recommendation",
  "visual_style": "natural",
  "text_style": "emotional",

  "meta": {
    "list_title": "10件提升幸福感的小家电",
    "item_count": 10,
    "total_budget": "3000以内",
    "items": [
      {
        "name": "戴森吹风机",
        "price": 2990,
        "purchase_link": "...",
        "reason": "快干护发"
      }
    ],
    "update_frequency": "seasonal",
    "affiliate": true
  }
}
```

### 4.6 旅行攻略类（tutorial + travel）

```json
{
  "track": "travel",
  "category": "tutorial",
  "visual_style": "vintage",
  "text_style": "storytelling",

  "meta": {
    "destination": "成都",
    "trip_duration": "3天2晚",
    "budget": "2000-3000",
    "season": "秋季最佳",
    "itinerary": [
      {
        "day": 1,
        "activities": ["宽窄巷子", "锦里", "春熙路"],
        "meals": ["陈麻婆豆腐", "龙抄手"]
      }
    ],
    "transportation": "高铁",
    "accommodation": ["民宿推荐", "酒店推荐"],
    "must_dos": ["熊猫基地", "吃火锅"],
    "tips": ["避开黄金周", "提前订票"]
  }
}
```

---

## 5. 数据库 Schema 设计

### 5.1 核心字段扩展

```typescript
// src/server/db/schema/tables/xhs.ts

export const xhsImageJobs = pgTable("xhs_image_jobs", {
  // ... 现有字段

  // ========== 内容分类体系 ==========

  // 一级：赛道
  track: text("track"),
  // lifestyle, beauty, fashion, travel, food, home, parenting,
  // fitness, education, tech, pets, finance

  // 二级：内容类型
  category: text("category"),
  // explore, review, tutorial, knowledge, recommendation,
  // lifestyle_vlog, comparison, collection, diy, case_study

  // 三级：风格
  visualStyle: text("visual_style"),
  // minimalist, dopamine, vintage, natural, modern, kawaii, luxury

  textStyle: text("text_style"),
  // casual, professional, storytelling, listicle, humorous, emotional

  // ========== 元属性 ==========

  // 结构化元数据（根据 category 不同，字段不同）
  metaAttributes: jsonb("meta_attributes").$type<XhsMetaAttributes>(),

  // 标签（用于搜索和推荐）
  tags: jsonb("tags").$type<string[]>(),

  // SEO关键词
  keywords: jsonb("keywords").$type<string[]>(),
});
```

### 5.2 TypeScript 类型定义

```typescript
// 元属性基类
interface BaseMetaAttributes {
  created_by?: string;
  last_updated?: string;
}

// 探店类元属性
interface ExploreMetaAttributes extends BaseMetaAttributes {
  shop_name: string;
  shop_type?: string;
  address?: string;
  opening_date?: string;
  price_range?: string;
  must_try?: string[];
  tags?: string[];
  best_time?: string;
  transportation?: string;
  reservation_required?: boolean;
  pet_friendly?: boolean;
  parking_available?: boolean;
}

// 测评类元属性
interface ReviewMetaAttributes extends BaseMetaAttributes {
  product_name: string;
  brand?: string;
  price?: number;
  capacity?: string;
  rating?: number;
  pros?: string[];
  cons?: string[];
  skin_type?: string[];
  usage_duration?: string;
  repurchase?: boolean;
  alternatives?: string[];
}

// 教程类元属性
interface TutorialMetaAttributes extends BaseMetaAttributes {
  title: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  time_required?: string;
  steps?: number;
  products_needed?: string[];
  suitable_for?: string[];
  occasion?: string[];
  season?: string[];
}

// 干货科普类元属性
interface KnowledgeMetaAttributes extends BaseMetaAttributes {
  topic: string;
  knowledge_depth?: 'beginner' | 'intermediate' | 'advanced';
  reading_time?: string;
  key_points?: string[];
  references?: string[];
  difficulty?: string;
  target_audience?: string[];
}

// 种草推荐类元属性
interface RecommendationMetaAttributes extends BaseMetaAttributes {
  list_title?: string;
  item_count?: number;
  total_budget?: string;
  items?: Array<{
    name: string;
    price?: number;
    purchase_link?: string;
    reason?: string;
  }>;
  update_frequency?: string;
  affiliate?: boolean;
}

// 联合类型
type XhsMetaAttributes =
  | ExploreMetaAttributes
  | ReviewMetaAttributes
  | TutorialMetaAttributes
  | KnowledgeMetaAttributes
  | RecommendationMetaAttributes;
```

---

## 6. 迁移 SQL

```sql
-- ============================================================
-- 小红书内容分类体系扩展 - 迁移脚本
-- ============================================================

BEGIN;

-- 1. 添加分类字段
ALTER TABLE xhs_image_jobs
ADD COLUMN IF NOT EXISTS track text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS visual_style text,
ADD COLUMN IF NOT EXISTS text_style text,
ADD COLUMN IF NOT EXISTS meta_attributes jsonb,
ADD COLUMN IF NOT EXISTS tags jsonb,
ADD COLUMN IF NOT EXISTS keywords jsonb;

-- 2. 添加字段注释
COMMENT ON COLUMN xhs_image_jobs.track IS '内容赛道：lifestyle, beauty, fashion, travel, food, home, etc.';
COMMENT ON COLUMN xhs_image_jobs.category IS '内容类型：explore, review, tutorial, knowledge, recommendation, etc.';
COMMENT ON COLUMN xhs_image_jobs.visual_style IS '视觉风格：minimalist, dopamine, vintage, natural, modern, kawaii, luxury';
COMMENT ON COLUMN xhs_image_jobs.text_style IS '文案风格：casual, professional, storytelling, listicle, humorous, emotional';
COMMENT ON COLUMN xhs_image_jobs.meta_attributes IS '元属性：根据category不同存储不同的结构化数据';
COMMENT ON COLUMN xhs_image_jobs.tags IS '内容标签数组，用于搜索和推荐';
COMMENT ON COLUMN xhs_image_jobs.keywords IS 'SEO关键词数组';

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_track ON xhs_image_jobs(track);
CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_category ON xhs_image_jobs(category);
CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_visual_style ON xhs_image_jobs(visual_style);

-- 4. 创建 GIN 索引（用于 JSONB 查询和全文搜索）
CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_tags ON xhs_image_jobs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_keywords ON xhs_image_jobs USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_meta_attributes ON xhs_image_jobs USING GIN(meta_attributes);

-- 5. 创建复合索引（常用查询组合）
CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_track_category
ON xhs_image_jobs(track, category);

CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_user_track_status
ON xhs_image_jobs(user_id, track, status);

COMMIT;
```

---

## 7. N8N 配置更新

### 7.1 INSERT SQL 更新

```sql
INSERT INTO xhs_image_jobs (
    user_id,
    source_url,
    source_title,
    total_images,
    status,
    started_at,
    image_prompt_id,
    input_content,
    style_prompt,
    generated_config,

    -- ✨ 新增分类字段
    track,
    category,
    visual_style,
    text_style,
    meta_attributes,
    tags,
    keywords
)
VALUES (
    '{{ $json.user_id }}'::uuid,
    '{{ $json.article_link }}',
    '{{ $json.title }}',
    {{ JSON.parse($json.output.replace(/```json/g, '').replace(/```/g, '').trim()).length }},
    'processing',
    NOW(),
    '{{ $json.prompt_id }}'::uuid,
    $${{ $json.input_content }}$$,
    $${{ $json.style_prompt }}$$,
    '{{ $json.output }}'::jsonb,

    -- ✨ 新增分类数据
    '{{ $json.track }}',
    '{{ $json.category }}',
    '{{ $json.visual_style }}',
    '{{ $json.text_style }}',
    '{{ $json.meta_attributes }}'::jsonb,
    '{{ $json.tags }}'::jsonb,
    '{{ $json.keywords }}'::jsonb
)
RETURNING id, created_at;
```

### 7.2 前端/上游需要传入的数据

```json
{
  "user_id": "...",
  "article_link": "...",
  "title": "深圳 Cafe 网红打卡咖啡店推荐",
  "prompt_id": "...",
  "input_content": "[...]",
  "style_prompt": "...",
  "output": "[...]",

  // ✨ 新增分类信息
  "track": "lifestyle",
  "category": "explore",
  "visual_style": "dopamine",
  "text_style": "casual",

  "meta_attributes": {
    "shop_name": "瞬间 Slack",
    "shop_type": "咖啡馆",
    "address": "深圳龙华区锦龙楼 b4 栋 301",
    "price_range": "30-60",
    "must_try": ["蓝柑冰淇淋汽水", "橙汁一夏"],
    "tags": ["韩系", "马卡龙", "拍照"],
    "pet_friendly": true
  },

  "tags": ["深圳咖啡", "韩系咖啡馆", "马卡龙风格", "新店推荐"],
  "keywords": ["深圳", "咖啡", "探店", "韩系", "马卡龙"]
}
```

---

## 8. 查询 SQL 更新

```sql
SELECT
  -- 任务基本信息
  j.id AS job_id,
  j.user_id,
  j.source_url,
  j.source_title,
  j.status,

  -- ✨ 分类信息
  j.track,
  j.category,
  j.visual_style,
  j.text_style,
  j.meta_attributes,
  j.tags,
  j.keywords,

  -- 配置信息
  j.input_content,
  j.style_prompt,
  j.generated_config,

  -- 图片信息
  COALESCE(
    json_agg(
      json_build_object(
        'id', i.id,
        'index', i.index,
        'type', i.type,
        'r2_url', i.r2_url,
        'core_message', i.core_message
      ) ORDER BY i.index
    ) FILTER (WHERE i.id IS NOT NULL),
    '[]'::json
  ) AS images

FROM xhs_image_jobs j
LEFT JOIN xhs_images i ON i.job_id = j.id
WHERE j.id = '{{ $json.body.job_id }}'::uuid
GROUP BY j.id
LIMIT 1;
```

---

## 9. 使用示例

### 9.1 创建探店任务

```typescript
const exploreShopTask = {
  track: "lifestyle",
  category: "explore",
  visual_style: "dopamine",
  text_style: "casual",

  meta_attributes: {
    shop_name: "瞬间 Slack",
    shop_type: "咖啡馆",
    address: "深圳龙华区锦龙楼 b4 栋 301",
    opening_date: "2024-09",
    price_range: "30-60",
    must_try: ["蓝柑冰淇淋汽水", "橙汁一夏"],
    tags: ["韩系", "马卡龙", "拍照", "新店"],
    best_time: "下午茶时段",
    pet_friendly: true,
    parking_available: false
  },

  tags: ["深圳咖啡", "韩系咖啡馆", "马卡龙风格", "新店推荐"],
  keywords: ["深圳", "咖啡", "探店", "韩系", "马卡龙", "龙华"]
};
```

### 9.2 Agent 使用分类信息生成正文

```javascript
// N8N Agent 节点
const data = $input.item.json;

// 根据 category 选择模板
const templates = {
  explore: (data) => `📍 ${data.source_title}

${data.generated_config.map((cfg, i) => `
${i + 1}️⃣ ${cfg.title}
${cfg.subtitle}
${cfg.body_points?.join('\n')}
`).join('\n')}

#${data.tags?.join(' #')}`,

  review: (data) => `【测评】${data.meta_attributes.product_name}

⭐ 评分：${data.meta_attributes.rating}/5
💰 价格：¥${data.meta_attributes.price}

✅ 优点：
${data.meta_attributes.pros?.map(p => `• ${p}`).join('\n')}

❌ 缺点：
${data.meta_attributes.cons?.map(c => `• ${c}`).join('\n')}

#${data.tags?.join(' #')}`,
};

const template = templates[data.category] || templates.explore;
const content = template(data);

return [{
  json: {
    title: data.source_title,
    content: content,
    images: data.images.map(img => img.r2_url),
    track: data.track,
    category: data.category,
    tags: data.tags
  }
}];
```

---

## 10. 推荐和搜索优化

### 10.1 基于分类的推荐查询

```sql
-- 推荐相似内容（同赛道、同类型）
SELECT *
FROM xhs_image_jobs
WHERE track = 'lifestyle'
  AND category = 'explore'
  AND status = 'completed'
  AND publish_status = 'published'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

### 10.2 标签搜索

```sql
-- 查找包含特定标签的内容
SELECT *
FROM xhs_image_jobs
WHERE tags @> '["韩系", "咖啡馆"]'::jsonb
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

### 10.3 全文搜索

```sql
-- 在 meta_attributes 中搜索
SELECT *
FROM xhs_image_jobs
WHERE meta_attributes @> '{"shop_type": "咖啡馆"}'::jsonb
  OR meta_attributes->'tags' @> '["韩系"]'::jsonb
ORDER BY created_at DESC;
```

---

## 11. 后续优化建议

### 11.1 创建枚举表（可选）

为了更好的数据一致性，可以创建枚举表：

```sql
-- 赛道枚举表
CREATE TABLE xhs_tracks (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  sort_order integer,
  created_at timestamp DEFAULT NOW()
);

-- 类型枚举表
CREATE TABLE xhs_categories (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text,
  applicable_tracks jsonb, -- 适用的赛道列表
  sort_order integer,
  created_at timestamp DEFAULT NOW()
);

-- 插入数据
INSERT INTO xhs_tracks (code, name, description, sort_order) VALUES
('lifestyle', '生活方式', '美食、咖啡、探店、home decor', 1),
('beauty', '美妆个护', '护肤、彩妆、发型、香水', 2),
-- ...
```

### 11.2 添加外键约束

```sql
ALTER TABLE xhs_image_jobs
ADD CONSTRAINT fk_xhs_image_jobs_track
FOREIGN KEY (track) REFERENCES xhs_tracks(code);

ALTER TABLE xhs_image_jobs
ADD CONSTRAINT fk_xhs_image_jobs_category
FOREIGN KEY (category) REFERENCES xhs_categories(code);
```

### 11.3 数据统计视图

```sql
-- 创建统计视图
CREATE VIEW xhs_content_stats AS
SELECT
  track,
  category,
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
  COUNT(CASE WHEN publish_status = 'published' THEN 1 END) as published_jobs,
  AVG(total_images) as avg_images
FROM xhs_image_jobs
WHERE deleted_at IS NULL
GROUP BY track, category
ORDER BY track, category;
```

---

## 12. 总结

这套分类体系提供了：

1. **三层分类结构**：赛道 → 类型 → 风格
2. **灵活的元属性**：根据内容类型存储不同的结构化信息
3. **强大的搜索能力**：通过标签、关键词、JSONB 查询实现精准搜索
4. **个性化推荐**：基于分类和标签的相似内容推荐
5. **数据分析支持**：统计不同赛道和类型的内容分布

**下一步**：
1. 执行迁移 SQL 创建新字段
2. 更新 TypeScript Schema
3. 修改 N8N INSERT SQL
4. 前端/上游添加分类信息输入
5. 更新查询 SQL 包含分类信息
