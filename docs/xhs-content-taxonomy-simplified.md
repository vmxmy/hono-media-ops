# 小红书内容分类体系设计（简化版）

## 概述

设计小红书内容的分类体系：**赛道（Track）→ 类型（Category）→ 元属性（Meta）**。

视觉风格和文案风格由系统中现有的 `image_prompts` 和 `style_analyses` 表管理。

---

## 1. 赛道（Track）- 一级分类

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

| 类型代码 | 类型名称 | 描述 | 适用赛道 | 特点 |
|---------|---------|------|---------|------|
| `explore` | 探店/探访 | 实地探访、体验分享 | lifestyle, food, travel | 强场景、重氛围 |
| `review` | 测评/评测 | 产品横评、深度测试 | beauty, tech, home | 数据详实、对比清晰 |
| `tutorial` | 教程/攻略 | 步骤教学、操作指南 | beauty, food, education | 结构化、可复制 |
| `knowledge` | 干货科普 | 知识分享、原理解析 | education, finance, fitness | 信息密度高 |
| `recommendation` | 种草推荐 | 好物分享、清单推荐 | 全赛道通用 | 强转化、带货属性 |
| `vlog` | 生活记录 | 日常vlog、随手拍 | lifestyle, travel, pets | 真实、轻松 |
| `comparison` | 对比选购 | A vs B、选购指南 | beauty, tech, home | 决策辅助 |
| `collection` | 合集/榜单 | Top N、盘点 | 全赛道通用 | 信息整合 |
| `diy` | DIY/手工 | 手作、改造、创意 | home, food, fashion | 创意、动手 |
| `case_study` | 案例分享 | 成功案例、改造前后 | home, fashion, fitness | 视觉冲击 |

---

## 3. 元属性（Meta Attributes）

根据不同内容类型，定义专属的结构化属性。

### 3.1 探店类（explore）

```typescript
interface ExploreMetaAttributes {
  shop_name: string;              // 店铺名称
  shop_type?: string;             // 店铺类型：咖啡馆、餐厅、书店等
  address?: string;               // 详细地址
  city?: string;                  // 城市
  district?: string;              // 区域
  opening_date?: string;          // 开业时间
  price_range?: string;           // 人均消费：30-60、100-200等
  must_try?: string[];            // 必点推荐
  business_hours?: string;        // 营业时间
  best_time?: string;             // 最佳到店时间
  transportation?: string;        // 交通方式
  reservation_required?: boolean; // 是否需预约
  pet_friendly?: boolean;         // 宠物友好
  parking_available?: boolean;    // 停车位
  wifi_available?: boolean;       // Wi-Fi
  phone?: string;                 // 联系电话
  features?: string[];            // 特色标签：拍照、约会、工作等
}
```

**示例**：
```json
{
  "shop_name": "瞬间 Slack",
  "shop_type": "咖啡馆",
  "address": "深圳龙华区锦龙楼 b4 栋 301",
  "city": "深圳",
  "district": "龙华区",
  "opening_date": "2024-09",
  "price_range": "30-60",
  "must_try": ["蓝柑冰淇淋汽水", "橙汁一夏"],
  "business_hours": "10:00-22:00",
  "best_time": "下午茶时段",
  "reservation_required": false,
  "pet_friendly": true,
  "parking_available": false,
  "wifi_available": true,
  "features": ["韩系", "马卡龙", "拍照", "新店"]
}
```

### 3.2 测评类（review）

```typescript
interface ReviewMetaAttributes {
  product_name: string;           // 产品名称
  brand?: string;                 // 品牌
  price?: number;                 // 价格
  capacity?: string;              // 容量/规格
  rating?: number;                // 评分（1-5）
  pros?: string[];                // 优点
  cons?: string[];                // 缺点
  suitable_for?: string[];        // 适合人群：干皮、油皮等
  usage_duration?: string;        // 使用周期
  repurchase?: boolean;           // 是否回购
  alternatives?: string[];        // 替代品推荐
  purchase_channel?: string;      // 购买渠道
  ingredients?: string[];         // 成分（美妆类）
  specifications?: Record<string, string>; // 规格参数（科技类）
}
```

**示例**：
```json
{
  "product_name": "雅诗兰黛小棕瓶",
  "brand": "Estée Lauder",
  "price": 780,
  "capacity": "50ml",
  "rating": 4.5,
  "pros": ["吸收快", "提亮", "修护"],
  "cons": ["价格贵", "香味重"],
  "suitable_for": ["干皮", "混合皮"],
  "usage_duration": "30天",
  "repurchase": true,
  "alternatives": ["兰蔻小黑瓶", "SK-II神仙水"],
  "purchase_channel": "专柜",
  "ingredients": ["二裂酵母", "透明质酸"]
}
```

### 3.3 教程类（tutorial）

```typescript
interface TutorialMetaAttributes {
  title: string;                  // 教程标题
  difficulty?: 'easy' | 'medium' | 'hard'; // 难度
  time_required?: string;         // 所需时间
  steps?: number;                 // 步骤数
  materials_needed?: string[];    // 所需材料/工具
  suitable_for?: string[];        // 适合人群
  occasion?: string[];            // 适用场景
  season?: string[];              // 适用季节
  skills_learned?: string[];      // 学到的技能
  video_duration?: string;        // 视频时长（如有）
}
```

**示例**：
```json
{
  "title": "日常通勤妆教程",
  "difficulty": "easy",
  "time_required": "15分钟",
  "steps": 7,
  "materials_needed": ["粉底液", "眼影盘", "口红"],
  "suitable_for": ["新手", "学生党"],
  "occasion": ["上班", "约会", "日常"],
  "season": ["四季通用"],
  "skills_learned": ["底妆技巧", "眼妆叠加"]
}
```

### 3.4 干货科普类（knowledge）

```typescript
interface KnowledgeMetaAttributes {
  topic: string;                  // 主题
  knowledge_depth?: 'beginner' | 'intermediate' | 'advanced'; // 深度
  reading_time?: string;          // 阅读时长
  key_points?: string[];          // 核心要点
  references?: string[];          // 参考资料
  target_audience?: string[];     // 目标受众
  myths_busted?: string[];        // 辟谣内容
  actionable_tips?: string[];     // 可执行建议
}
```

**示例**：
```json
{
  "topic": "HIIT训练原理",
  "knowledge_depth": "intermediate",
  "reading_time": "5分钟",
  "key_points": ["什么是HIIT", "燃脂原理", "训练方案"],
  "target_audience": ["健身爱好者", "减脂人群"],
  "myths_busted": ["HIIT不适合新手（错）"],
  "actionable_tips": ["每周3次", "控制心率", "注意拉伸"]
}
```

### 3.5 种草推荐类（recommendation）

```typescript
interface RecommendationMetaAttributes {
  list_title?: string;            // 清单标题
  item_count?: number;            // 物品数量
  total_budget?: string;          // 总预算
  items?: Array<{                 // 推荐物品列表
    name: string;
    price?: number;
    purchase_link?: string;
    reason?: string;
    priority?: number;            // 优先级
  }>;
  update_frequency?: string;      // 更新频率：季节性、年度等
  affiliate?: boolean;            // 是否带货
  target_group?: string[];        // 目标人群
}
```

**示例**：
```json
{
  "list_title": "10件提升幸福感的小家电",
  "item_count": 10,
  "total_budget": "3000以内",
  "items": [
    {
      "name": "戴森吹风机",
      "price": 2990,
      "reason": "快干护发",
      "priority": 1
    }
  ],
  "update_frequency": "seasonal",
  "affiliate": true,
  "target_group": ["精致女性", "预算充足"]
}
```

### 3.6 旅行攻略类（tutorial + travel）

```typescript
interface TravelMetaAttributes {
  destination: string;            // 目的地
  trip_duration?: string;         // 行程时长
  budget?: string;                // 预算范围
  best_season?: string;           // 最佳季节
  itinerary?: Array<{             // 行程安排
    day: number;
    activities: string[];
    meals?: string[];
    accommodation?: string;
  }>;
  transportation?: string;        // 交通方式
  must_dos?: string[];            // 必做事项
  must_eats?: string[];           // 必吃美食
  tips?: string[];                // 旅行贴士
  avoid?: string[];               // 避坑指南
}
```

**示例**：
```json
{
  "destination": "成都",
  "trip_duration": "3天2晚",
  "budget": "2000-3000",
  "best_season": "秋季",
  "itinerary": [
    {
      "day": 1,
      "activities": ["宽窄巷子", "锦里"],
      "meals": ["陈麻婆豆腐", "龙抄手"]
    }
  ],
  "transportation": "高铁",
  "must_dos": ["熊猫基地", "吃火锅"],
  "must_eats": ["火锅", "串串", "兔头"],
  "tips": ["避开黄金周", "提前订票"],
  "avoid": ["景区周边餐厅", "黑车"]
}
```

### 3.7 合集/榜单类（collection）

```typescript
interface CollectionMetaAttributes {
  list_title: string;             // 榜单标题
  item_count: number;             // 项目数量
  ranking_criteria?: string;      // 排序标准
  items: Array<{                  // 榜单项目
    rank: number;
    name: string;
    description?: string;
    score?: number;
    image_url?: string;
  }>;
  update_date?: string;           // 更新日期
  data_source?: string;           // 数据来源
}
```

**示例**：
```json
{
  "list_title": "深圳15家必去咖啡店",
  "item_count": 15,
  "ranking_criteria": "综合评分",
  "items": [
    {
      "rank": 1,
      "name": "瞬间 Slack",
      "description": "韩系马卡龙风格",
      "score": 9.5
    }
  ],
  "update_date": "2026-01",
  "data_source": "编辑推荐"
}
```

---

## 4. 数据库 Schema 设计

### 4.1 字段定义

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
  // vlog, comparison, collection, diy, case_study

  // ========== 元属性 ==========

  // 结构化元数据（根据 category 不同，结构不同）
  metaAttributes: jsonb("meta_attributes").$type<XhsMetaAttributes>(),

  // 标签（用于搜索和推荐）
  tags: jsonb("tags").$type<string[]>(),

  // SEO关键词
  keywords: jsonb("keywords").$type<string[]>(),

  // ========== 关联字段（已存在于系统中）==========
  // imagePromptId: uuid("image_prompt_id")  -> 视觉风格由此管理
  // styleAnalysisId: uuid("style_analysis_id") -> 文案风格由此管理（如果有）
});
```

### 4.2 TypeScript 类型定义

```typescript
// 元属性联合类型
type XhsMetaAttributes =
  | ExploreMetaAttributes
  | ReviewMetaAttributes
  | TutorialMetaAttributes
  | KnowledgeMetaAttributes
  | RecommendationMetaAttributes
  | TravelMetaAttributes
  | CollectionMetaAttributes;

// 导出所有类型
export type {
  ExploreMetaAttributes,
  ReviewMetaAttributes,
  TutorialMetaAttributes,
  KnowledgeMetaAttributes,
  RecommendationMetaAttributes,
  TravelMetaAttributes,
  CollectionMetaAttributes,
  XhsMetaAttributes,
};
```

---

## 5. 迁移 SQL

```sql
-- ============================================================
-- 小红书内容分类体系扩展 - 迁移脚本
-- Version: 0013_add_content_taxonomy
-- Created: 2026-01-26
-- ============================================================

BEGIN;

-- 1. 添加分类字段
ALTER TABLE xhs_image_jobs
ADD COLUMN IF NOT EXISTS track text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS meta_attributes jsonb,
ADD COLUMN IF NOT EXISTS tags jsonb,
ADD COLUMN IF NOT EXISTS keywords jsonb;

-- 2. 添加字段注释
COMMENT ON COLUMN xhs_image_jobs.track IS '内容赛道：lifestyle, beauty, fashion, travel, food, home, parenting, fitness, education, tech, pets, finance';
COMMENT ON COLUMN xhs_image_jobs.category IS '内容类型：explore, review, tutorial, knowledge, recommendation, vlog, comparison, collection, diy, case_study';
COMMENT ON COLUMN xhs_image_jobs.meta_attributes IS '元属性：根据category不同存储不同的结构化数据（店铺信息、产品参数等）';
COMMENT ON COLUMN xhs_image_jobs.tags IS '内容标签数组，用于搜索和推荐';
COMMENT ON COLUMN xhs_image_jobs.keywords IS 'SEO关键词数组';

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_track
ON xhs_image_jobs(track)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_category
ON xhs_image_jobs(category)
WHERE deleted_at IS NULL;

-- 4. 创建 GIN 索引（用于 JSONB 查询）
CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_tags
ON xhs_image_jobs USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_keywords
ON xhs_image_jobs USING GIN(keywords);

CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_meta_attributes
ON xhs_image_jobs USING GIN(meta_attributes);

-- 5. 创建复合索引（常用查询组合）
CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_track_category
ON xhs_image_jobs(track, category)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_xhs_image_jobs_user_track_status
ON xhs_image_jobs(user_id, track, status)
WHERE deleted_at IS NULL;

COMMIT;

-- ============================================================
-- 验证 SQL
-- ============================================================

-- 检查字段是否创建成功
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'xhs_image_jobs'
  AND column_name IN ('track', 'category', 'meta_attributes', 'tags', 'keywords')
ORDER BY column_name;

-- 检查索引
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'xhs_image_jobs'
  AND indexname LIKE '%track%' OR indexname LIKE '%category%' OR indexname LIKE '%tags%'
ORDER BY indexname;
```

---

## 6. N8N 配置更新

### 6.1 INSERT SQL 更新

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
    '{{ $json.meta_attributes }}'::jsonb,
    '{{ $json.tags }}'::jsonb,
    '{{ $json.keywords }}'::jsonb
)
RETURNING id, created_at;
```

### 6.2 前端需要传入的数据结构

```json
{
  "user_id": "...",
  "article_link": "https://mp.weixin.qq.com/s/xxx",
  "title": "深圳 Cafe 网红打卡咖啡店推荐",
  "prompt_id": "...",
  "input_content": "[...]",
  "style_prompt": "...",
  "output": "[...]",

  // ✨ 新增分类信息
  "track": "lifestyle",
  "category": "explore",

  // ✨ 元属性（根据 category 不同，结构不同）
  "meta_attributes": {
    "shop_name": "瞬间 Slack",
    "shop_type": "咖啡馆",
    "address": "深圳龙华区锦龙楼 b4 栋 301",
    "city": "深圳",
    "district": "龙华区",
    "opening_date": "2024-09",
    "price_range": "30-60",
    "must_try": ["蓝柑冰淇淋汽水", "橙汁一夏"],
    "pet_friendly": true,
    "features": ["韩系", "马卡龙", "拍照", "新店"]
  },

  // ✨ 标签和关键词
  "tags": ["深圳咖啡", "韩系咖啡馆", "马卡龙风格", "新店推荐", "龙华探店"],
  "keywords": ["深圳", "咖啡", "探店", "韩系", "马卡龙", "龙华", "瞬间Slack"]
}
```

---

## 7. 查询 SQL 更新

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
  j.publish_status,

  -- ✨ 分类信息
  j.track,
  j.category,
  j.meta_attributes,
  j.tags,
  j.keywords,

  -- 配置信息
  j.input_content,
  j.style_prompt,
  j.generated_config,

  -- 关联的视觉风格（来自 image_prompts 表）
  p.title AS prompt_title,
  p.prompt AS base_prompt,
  p.category AS prompt_category,

  -- 图片信息
  COALESCE(
    json_agg(
      json_build_object(
        'id', i.id,
        'index', i.index,
        'type', i.type,
        'r2_url', i.r2_url,
        'wechat_url', i.wechat_url,
        'core_message', i.core_message,
        'text_content', i.text_content
      ) ORDER BY i.index
    ) FILTER (WHERE i.id IS NOT NULL),
    '[]'::json
  ) AS images

FROM xhs_image_jobs j
LEFT JOIN image_prompts p ON p.id = j.image_prompt_id
LEFT JOIN xhs_images i ON i.job_id = j.id
WHERE j.id = '{{ $json.body.job_id }}'::uuid
GROUP BY j.id, p.title, p.prompt, p.category
LIMIT 1;
```

---

## 8. Agent 使用示例

### 8.1 根据分类生成个性化正文

```javascript
// N8N Agent 节点
const data = $input.item.json;
const { track, category, meta_attributes, tags } = data;

// 根据不同类型生成不同模板
const contentGenerators = {
  explore: (data, meta) => {
    const shops = data.generated_config.filter(cfg => cfg.type === 'content');
    return `📍 ${data.source_title}

${shops.map((shop, i) => {
  const shopMeta = meta.items?.[i] || {};
  return `${i + 1}️⃣ ${shop.title}
${shop.subtitle}
${shop.body_points?.join('\n')}
`;
}).join('\n')}

#${tags.join(' #')}`;
  },

  review: (data, meta) => {
    return `【测评】${meta.product_name}

⭐ 评分：${meta.rating}/5
💰 价格：¥${meta.price}
📦 规格：${meta.capacity}

✅ 优点：
${meta.pros?.map(p => `• ${p}`).join('\n')}

❌ 缺点：
${meta.cons?.map(c => `• ${c}`).join('\n')}

💡 适合：${meta.suitable_for?.join('、')}

${meta.repurchase ? '✨ 值得回购！' : ''}

#${tags.join(' #')}`;
  },

  collection: (data, meta) => {
    return `📋 ${meta.list_title}

${meta.items.map((item, i) => {
  const config = data.generated_config[i];
  return `${item.rank}️⃣ ${item.name}
${item.description}
${config?.body_points?.join('\n')}
`;
}).join('\n')}

#${tags.join(' #')}`;
  }
};

// 生成正文
const generator = contentGenerators[category] || contentGenerators.explore;
const content = generator(data, meta_attributes);

return [{
  json: {
    title: data.source_title,
    content: content,
    images: data.images.map(img => img.r2_url || img.wechat_url),
    track: track,
    category: category,
    tags: tags,
    keywords: data.keywords
  }
}];
```

### 8.2 基于分类的搜索和推荐

```sql
-- 推荐相似内容（同赛道、同类型）
SELECT
  id,
  source_title,
  tags,
  created_at
FROM xhs_image_jobs
WHERE track = 'lifestyle'
  AND category = 'explore'
  AND status = 'completed'
  AND publish_status = 'published'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 标签搜索（包含指定标签）
SELECT *
FROM xhs_image_jobs
WHERE tags @> '["韩系", "咖啡馆"]'::jsonb
  AND deleted_at IS NULL
ORDER BY created_at DESC;

-- 在元属性中搜索（探店类 - 按城市）
SELECT *
FROM xhs_image_jobs
WHERE category = 'explore'
  AND meta_attributes->>'city' = '深圳'
  AND deleted_at IS NULL
ORDER BY created_at DESC;

-- 在元属性中搜索（测评类 - 按品牌）
SELECT *
FROM xhs_image_jobs
WHERE category = 'review'
  AND meta_attributes->>'brand' = 'Estée Lauder'
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

---

## 9. 数据示例对照

### 9.1 探店任务完整数据

```json
{
  // 基础信息
  "job_id": "xxx",
  "source_title": "深圳 Cafe 网红打卡咖啡店推荐",
  "status": "completed",

  // ✨ 分类信息
  "track": "lifestyle",
  "category": "explore",

  // ✨ 元属性（探店专用）
  "meta_attributes": {
    "shop_name": "瞬间 Slack",
    "shop_type": "咖啡馆",
    "address": "深圳龙华区锦龙楼 b4 栋 301",
    "city": "深圳",
    "district": "龙华区",
    "price_range": "30-60",
    "must_try": ["蓝柑冰淇淋汽水"],
    "pet_friendly": true,
    "features": ["韩系", "拍照"]
  },

  // ✨ 标签和关键词
  "tags": ["深圳咖啡", "韩系咖啡馆", "龙华探店"],
  "keywords": ["深圳", "咖啡", "探店", "韩系"],

  // 视觉风格（来自 image_prompts 表）
  "image_prompt_id": "xxx",
  "prompt_title": "小红书3D风格",

  // 生成配置
  "generated_config": [...],
  "images": [...]
}
```

---

## 10. 总结

这套简化的分类体系提供了：

1. **两层分类**：赛道（Track）→ 类型（Category）
2. **灵活的元属性**：根据内容类型存储不同的结构化信息
3. **标签系统**：支持多维度搜索和推荐
4. **与现有系统集成**：视觉风格由 `image_prompts` 管理

**核心优势**：
- ✅ 结构清晰，易于理解和维护
- ✅ 灵活的 JSONB 存储，适应不同内容类型
- ✅ 强大的搜索能力（GIN 索引）
- ✅ 与现有风格管理系统无缝集成

**下一步**：
1. 执行迁移 SQL
2. 更新 TypeScript Schema
3. 修改 N8N INSERT SQL
4. 前端添加分类信息输入
