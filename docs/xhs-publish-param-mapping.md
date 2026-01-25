# 小红书图文发布参数映射规范

## 目标 API 接口

**端点**: `POST /api/v1/publish`

**必需参数**:
- `title` (string): 标题
- `content` (string): 正文内容
- `images` (array<string>): 图片数组，至少1张

**可选参数**:
- `tags` (array<string>): 话题标签数组
- `marker_tags` (array<string>): 标记标签数组
- `location` (string): 位置信息
- `schedule_at` (string): 定时发布时间 (ISO8601格式)

---

## 元数据字段清单

### 基础信息字段

| 元数据字段 | 类型 | 说明 | 示例值 |
|-----------|------|------|--------|
| `source_title` | string | 原文章标题 | "香港私藏Cafe" |
| `track` | string | 内容赛道 | "lifestyle" |
| `category` | string | 内容分类 | "explore" |

### 标签相关字段

| 元数据字段 | 类型 | 说明 | 示例值 |
|-----------|------|------|--------|
| `tags` | array<string> | 话题标签 | ["香港咖啡", "香港探店", "香港生活", "精品咖啡", "周末打卡", "咖啡地图", "我的私藏咖啡馆"] |
| `keywords` | array<string> | 关键词列表 | ["香港", "咖啡店", "探店", "铜锣湾", "湾仔", "坚尼地城", "草间弥生", "工业风", "下午茶", "手冲咖啡"] |

### 位置信息字段

| 元数据字段 | 类型 | 说明 | 示例值 |
|-----------|------|------|--------|
| `meta_attributes.location_summary.city` | string | 城市名称 | "香港" |
| `meta_attributes.location_summary.districts` | array<string> | 区域列表 | ["铜锣湾", "湾仔", "西营盘", "坚尼地城", "中环"] |
| `meta_attributes.location_summary.total_shops` | number | 店铺总数 | 8 |

### 内容结构字段

| 元数据字段 | 类型 | 说明 | 示例值 |
|-----------|------|------|--------|
| `content_items` | array<object> | 内容项数组 | 包含封面和内容页 |
| `content_items[].type` | string | 内容类型 | "cover" / "content" |
| `content_items[].index` | number | 顺序索引 | 1, 2, 3... |
| `content_items[].title` | string | 标题 | "The Coffee Academics" |
| `content_items[].subtitle` | string | 副标题 | "入选全球25家必去咖啡店" |
| `content_items[].body_points` | array<string> | 要点列表 | ["📍 地址：...", "🕙 营业：...", "🍰 必点：..."] |

### 店铺信息字段

| 元数据字段 | 类型 | 说明 | 示例值 |
|-----------|------|------|--------|
| `shops` | array<object> | 店铺数组 | 提取的店铺信息 |
| `shops[].index` | number | 店铺序号 | 2, 3, 4... |
| `shops[].title` | string | 店铺名称 | "The Coffee Academics" |
| `shops[].subtitle` | string | 店铺描述 | "入选全球25家必去咖啡店" |
| `shops[].body_points` | array<string> | 详细信息 | ["📍 地址：...", "🕙 营业：...", "🍰 必点：..."] |

### 图片相关字段

| 元数据字段 | 类型 | 说明 | 示例值 |
|-----------|------|------|--------|
| `images` | array<object> | 图片数组 | 已生成并上传的图片 |
| `images[].index` | number | 图片序号 | 1, 2, 3... |
| `images[].type` | string | 图片类型 | "cover" / "content" |
| `images[].r2_url` | string | R2存储URL (主要使用) | "https://pub-c918ab..." |
| `images[].wechat_url` | string | 微信图片URL | "http://mmbiz.qpic.cn/..." |
| `images[].wechat_media_id` | string | 微信媒体ID | "xv9tsA2b6d4Mz..." |

### 统计字段

| 元数据字段 | 类型 | 说明 | 示例值 |
|-----------|------|------|--------|
| `total_images` | number | 总图片数 | 9 |
| `completed_images` | number | 已完成图片数 | 9 |
| `total_content_items` | string | 内容项总数 | "9" |
| `shop_count` | string | 店铺数量 | "8" |
| `cover_count` | string | 封面数量 | "1" |

---

## 参数映射规则

### 1. `title` (必需)

**映射源**: `source_title`

**格式要求**:
- 最大长度: 20字符 (小红书限制)
- 需要吸引眼球、简洁明了

**映射逻辑**:
```javascript
const title = metadata.source_title
```

**示例**:
```
元数据: "香港私藏Cafe"
API参数: "香港私藏Cafe"
```

---

### 2. `content` (必需)

**映射源**: 组合多个字段生成

**格式要求**:
- 最大长度: 1000字符
- 使用换行符分段
- 包含 emoji 增强可读性

**映射逻辑**:
```javascript
// 方案1: 基于封面页构建
const coverItem = metadata.content_items.find(item => item.type === 'cover')
const content = `${coverItem.subtitle}\n\n${coverItem.body_points.join('\n')}`

// 方案2: 基于店铺列表构建
const shopsList = metadata.shops.map((shop, idx) =>
  `${idx + 1}️⃣ ${shop.title}\n${shop.subtitle}\n${shop.body_points.join('\n')}`
).join('\n\n')

// 方案3: 混合式 (推荐)
const content = `
${coverItem.subtitle}

${coverItem.body_points.join('\n')}

---

${shopsList}
`.trim()
```

**示例**:
```
8间本地人常去的宝藏店

📍 坐标：香港(铜锣湾/湾仔/坚尼地城)
☕ 核心：全球Top25/拉花冠军/草间弥生
📸 风格：工业复古·侘寂·海边氛围

---

1️⃣ The Coffee Academics
入选全球25家必去咖啡店
📍 地址：湾仔道225号骏逸峰地铺
🕙 营业：08:00-18:00
🍰 必点：冲绳黑糖咖啡

...
```

---

### 3. `images` (必需)

**映射源**: `images[].r2_url`

**格式要求**:
- 数组至少包含1个元素
- 使用 R2 存储的图片 URL
- 按 `index` 升序排列

**映射逻辑**:
```javascript
const images = metadata.images
  .sort((a, b) => a.index - b.index)
  .map(img => img.r2_url)
```

**示例**:
```javascript
[
  "https://pub-c918abf638c7475fa46f2a62c795106f.r2.dev/images/20260125-124331-321.png",
  "https://pub-c918abf638c7475fa46f2a62c795106f.r2.dev/images/20260125-124353-309.png",
  "https://pub-c918abf638c7475fa46f2a62c795106f.r2.dev/images/20260125-124415-945.png",
  ...
]
```

---

### 4. `tags` (可选)

**映射源**: `tags`

**格式要求**:
- 最多10个标签
- 每个标签不超过10字符
- 优先选择热门、相关性高的标签

**映射逻辑**:
```javascript
const tags = metadata.tags.slice(0, 10)

// 或在 TypeScript 中
const images = metadata.images
  .sort((a: any, b: any) => a.index - b.index)
  .map((img: any) => img.r2_url)
```

---

### 5. `marker_tags` (可选)

**映射源**: `keywords` 或 `meta_attributes.featured_items`

**格式要求**:
- 用于标记关键词
- 可以是地点、品牌、特色等

**映射逻辑**:
```javascript
// 方案1: 使用关键词
const markerTags = metadata.keywords.slice(0, 5)

// 方案2: 使用特色项目
const markerTags = metadata.meta_attributes?.featured_items || []
```

**示例**:
```javascript
// 方案1
["香港", "咖啡店", "探店", "铜锣湾", "湾仔"]

// 方案2
["冲绳黑糖咖啡", "草间弥生打印咖啡", "黑芝麻拿铁", "拉花澳白"]
```

---

### 6. `location` (可选)

**映射源**: `meta_attributes.location_summary`

**格式要求**:
- 格式: "城市 · 区域"
- 如果有多个区域，选择主要区域或合并

**映射逻辑**:
```javascript
const { city, districts } = metadata.meta_attributes.location_summary

// 方案1: 单一区域
const location = `${city} · ${districts[0]}`

// 方案2: 多区域合并
const location = `${city} · ${districts.slice(0, 3).join('/')}`
```

**示例**:
```
方案1: "香港 · 铜锣湾"
方案2: "香港 · 铜锣湾/湾仔/坚尼地城"
```

---

### 7. `schedule_at` (可选)

**映射源**: 外部参数或业务逻辑

**格式要求**:
- ISO8601 格式
- 未来时间
- 为空则立即发布

**映射逻辑**:
```javascript
// 从 N8N workflow 传入或根据业务规则生成
const scheduleAt = workflow.publishTime || null

// 示例: 设置为第二天早上 8:00
const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
tomorrow.setHours(8, 0, 0, 0)
const scheduleAt = tomorrow.toISOString()
```

**示例**:
```
"2026-01-26T08:00:00.000Z"
null (立即发布)
```

---

## 完整映射示例

### 输入 (元数据)

```json
{
  "source_title": "香港私藏Cafe",
  "tags": ["香港咖啡", "香港探店", "香港生活", "精品咖啡", "周末打卡", "咖啡地图", "我的私藏咖啡馆"],
  "keywords": ["香港", "咖啡店", "探店", "铜锣湾", "湾仔"],
  "meta_attributes": {
    "location_summary": {
      "city": "香港",
      "districts": ["铜锣湾", "湾仔", "西营盘"]
    },
    "featured_items": ["冲绳黑糖咖啡", "草间弥生打印咖啡"]
  },
  "content_items": [
    {
      "type": "cover",
      "subtitle": "8间本地人常去的宝藏店",
      "body_points": [
        "📍 坐标：香港(铜锣湾/湾仔/坚尼地城)",
        "☕ 核心：全球Top25/拉花冠军/草间弥生",
        "📸 风格：工业复古·侘寂·海边氛围"
      ]
    }
  ],
  "shops": [
    {
      "title": "The Coffee Academics",
      "subtitle": "入选全球25家必去咖啡店",
      "body_points": [
        "📍 地址：湾仔道225号骏逸峰地铺",
        "🕙 营业：08:00-18:00",
        "🍰 必点：冲绳黑糖咖啡"
      ]
    }
  ],
  "images": [
    {
      "index": 1,
      "r2_url": "https://pub-c918abf638c7475fa46f2a62c795106f.r2.dev/images/20260125-124331-321.png"
    },
    {
      "index": 2,
      "r2_url": "https://pub-c918abf638c7475fa46f2a62c795106f.r2.dev/images/20260125-124353-309.png"
    }
  ]
}
```

### 输出 (API 参数)

```json
{
  "title": "香港私藏Cafe",
  "content": "8间本地人常去的宝藏店\n\n📍 坐标：香港(铜锣湾/湾仔/坚尼地城)\n☕ 核心：全球Top25/拉花冠军/草间弥生\n📸 风格：工业复古·侘寂·海边氛围\n\n---\n\n1️⃣ The Coffee Academics\n入选全球25家必去咖啡���\n📍 地址：湾仔道225号骏逸峰地铺\n🕙 营业：08:00-18:00\n🍰 必点：冲绳黑糖咖啡",
  "images": [
    "https://pub-c918abf638c7475fa46f2a62c795106f.r2.dev/images/20260125-124331-321.png",
    "https://pub-c918abf638c7475fa46f2a62c795106f.r2.dev/images/20260125-124353-309.png"
  ],
  "tags": [
    "香港咖啡",
    "香港探店",
    "香港生活",
    "精品咖啡",
    "周末打卡",
    "咖啡地图",
    "我的私藏咖啡馆"
  ],
  "marker_tags": [
    "冲绳黑糖咖啡",
    "草间弥生打印咖啡"
  ],
  "location": "香港 · 铜锣湾/湾仔/西营盘",
  "schedule_at": null
}
```

---

## 数据转换函数模板

### JavaScript (N8N Code Node)

```javascript
// 输入: $input.item.json (元数据)
const metadata = $input.item.json

// 1. 提取标题
const title = metadata.source_title

// 2. 构建正文
const coverItem = metadata.content_items.find(item => item.type === 'cover')
const shopsList = metadata.shops.map((shop, idx) =>
  `${idx + 1}️⃣ ${shop.title}\n${shop.subtitle}\n${shop.body_points.join('\n')}`
).join('\n\n')

const content = `
${coverItem.subtitle}

${coverItem.body_points.join('\n')}

---

${shopsList}
`.trim()

// 3. 提取图片
const images = metadata.images
  .sort((a, b) => a.index - b.index)
  .map(img => img.wechat_media_id)

// 4. 标签
const tags = metadata.tags.slice(0, 10)

// 5. 标记标签
const markerTags = metadata.meta_attributes?.featured_items || []

// 6. 位置
const { city, districts } = metadata.meta_attributes.location_summary
const location = `${city} · ${districts.slice(0, 3).join('/')}`

// 7. 定时发布 (可选)
const scheduleAt = null // 或从 workflow 参数传入

// 输出
return {
  title,
  content,
  images,
  tags,
  marker_tags: markerTags,
  location,
  schedule_at: scheduleAt
}
```

### TypeScript (服务端)

```typescript
interface PublishParams {
  title: string
  content: string
  images: string[]
  tags?: string[]
  marker_tags?: string[]
  location?: string
  schedule_at?: string | null
}

function transformMetadataToPublishParams(metadata: any): PublishParams {
  // 1. 标题
  const title = metadata.source_title

  // 2. 正文
  const coverItem = metadata.content_items.find((item: any) => item.type === 'cover')
  const shopsList = metadata.shops
    .map((shop: any, idx: number) =>
      `${idx + 1}️⃣ ${shop.title}\n${shop.subtitle}\n${shop.body_points.join('\n')}`
    )
    .join('\n\n')

  const content = `
${coverItem.subtitle}

${coverItem.body_points.join('\n')}

---

${shopsList}
  `.trim()

  // 3. 图片
  const images = metadata.images
    .sort((a: any, b: any) => a.index - b.index)
    .map((img: any) => img.r2_url)

  // 4. 标签
  const tags = metadata.tags.slice(0, 10)

  // 5. 标记标签
  const markerTags = metadata.meta_attributes?.featured_items || []

  // 6. 位置
  const { city, districts } = metadata.meta_attributes.location_summary
  const location = `${city} · ${districts.slice(0, 3).join('/')}`

  return {
    title,
    content,
    images,
    tags,
    marker_tags: markerTags,
    location,
    schedule_at: null
  }
}
```

---

## 注意事项

### 字段验证

1. **必需字段检查**:
   ```javascript
   if (!metadata.source_title) throw new Error('缺少标题')
   if (!metadata.images || metadata.images.length === 0) throw new Error('缺少图片')
   ```

2. **长度限制**:
   ```javascript
   if (title.length > 20) title = title.slice(0, 20)
   if (content.length > 1000) content = content.slice(0, 997) + '...'
   ```

3. **数据完整性**:
   ```javascript
   const hasR2Urls = metadata.images.every(img => img.r2_url)
   if (!hasR2Urls) throw new Error('部分图片缺少 R2 存储 URL')
   ```

### 业务规则

1. **发布时机**: 根据 `category` 和 `track` 选择最佳发布时间
2. **标签优化**: 根据小红书热门标签调整 `tags` 顺序
3. **内容截断**: 如果正文过长，优先保留店铺列表的前几项

### 错误处理

```javascript
try {
  const publishParams = transformMetadataToPublishParams(metadata)
  // 调用发布 API
} catch (error) {
  console.error('参数转换失败:', error.message)
  // 记录错误日志
  // 通知运维
}
```
