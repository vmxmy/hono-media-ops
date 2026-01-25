# N8N 小红书发布参数提取器 - Code Node

## 节点配置

**节点类型**: Code (JavaScript)
**位置**: 发布 Workflow 中，位于「查询任务数据」节点之后，「调用小红书发布 API」节点之前
**模式**: Run Once for All Items

---

## 完整代码

```javascript
// ============================================
// N8N Code Node - 小红书发布参数提取器
// ============================================
// 功能: 将元数据转换为小红书发布 API 参数
// 输入: $input.all() - 包含元数据的数组
// 输出: 符合小红书 API 规范的发布参数对象
// ============================================

const items = $input.all();
const results = [];

// 遍历所有输入项
for (const item of items) {
  const metadata = item.json;

  try {
    // ==================== 数据验证 ====================

    // 检查必需字段
    if (!metadata.source_title) {
      throw new Error('缺少必需字段: source_title');
    }

    if (!metadata.images || !Array.isArray(metadata.images) || metadata.images.length === 0) {
      throw new Error('缺少必需字段: images 或图片数组为空');
    }

    // 检查图片是否都有 R2 URL
    const missingR2Urls = metadata.images.filter(img => !img.r2_url);
    if (missingR2Urls.length > 0) {
      throw new Error(`${missingR2Urls.length} 张图片缺少 r2_url`);
    }

    // ==================== 参数提取 ====================

    // 1️⃣ 标题 (title) - 必需
    let title = metadata.source_title;

    // 长度限制检查 (小红书限制20字符)
    if (title.length > 20) {
      console.log(`标题超过20字符，原长度: ${title.length}，已截断`);
      title = title.slice(0, 20);
    }

    // 2️⃣ 正文 (content) - 必需
    let content = '';

    // 查找封面页
    const coverItem = metadata.content_items?.find(item => item.type === 'cover');

    if (coverItem) {
      // 添加封面副标题
      content += `${coverItem.subtitle}\n\n`;

      // 添加封面要点
      if (coverItem.body_points && Array.isArray(coverItem.body_points)) {
        content += coverItem.body_points.join('\n');
        content += '\n\n';
      }
    }

    // 添加分隔线
    content += '---\n\n';

    // 添加店铺列表
    if (metadata.shops && Array.isArray(metadata.shops)) {
      const shopsList = metadata.shops.map((shop, idx) => {
        let shopText = `${idx + 1}️⃣ ${shop.title}`;

        if (shop.subtitle) {
          shopText += `\n${shop.subtitle}`;
        }

        if (shop.body_points && Array.isArray(shop.body_points)) {
          shopText += `\n${shop.body_points.join('\n')}`;
        }

        return shopText;
      }).join('\n\n');

      content += shopsList;
    }

    // 去除首尾空白
    content = content.trim();

    // 长度限制检查 (小红书限制1000字符)
    if (content.length > 1000) {
      console.log(`正文超过1000字符，原长度: ${content.length}，已截断`);
      content = content.slice(0, 997) + '...';
    }

    // 3️⃣ 图片数组 (images) - 必需
    const images = metadata.images
      .sort((a, b) => a.index - b.index)  // 按索引排序
      .map(img => img.r2_url);            // 提取 R2 存储 URL

    // 4️⃣ 标签 (tags) - 可选
    let tags = [];
    if (metadata.tags && Array.isArray(metadata.tags)) {
      // 最多10个标签
      tags = metadata.tags.slice(0, 10);
    }

    // 5️⃣ 标记标签 (marker_tags) - 可选
    let markerTags = [];

    // 优先使用 featured_items
    if (metadata.meta_attributes?.featured_items &&
        Array.isArray(metadata.meta_attributes.featured_items)) {
      markerTags = metadata.meta_attributes.featured_items;
    }
    // 备选: 使用 keywords 的前5个
    else if (metadata.keywords && Array.isArray(metadata.keywords)) {
      markerTags = metadata.keywords.slice(0, 5);
    }

    // 6️⃣ 位置 (location) - 可选
    let location = null;

    if (metadata.meta_attributes?.location_summary) {
      const { city, districts } = metadata.meta_attributes.location_summary;

      if (city && districts && Array.isArray(districts) && districts.length > 0) {
        // 最多显示3个区域
        const displayDistricts = districts.slice(0, 3).join('/');
        location = `${city} · ${displayDistricts}`;
      } else if (city) {
        location = city;
      }
    }

    // 7️⃣ 定时发布 (schedule_at) - 可选
    // 从 workflow 参数传入，或设为 null (立即发布)
    const scheduleAt = item.json.schedule_at || null;

    // ==================== 构建输出对象 ====================

    const publishParams = {
      title,
      content,
      images,
      tags,
      marker_tags: markerTags,
      location,
      schedule_at: scheduleAt
    };

    // ==================== 输出日志 ====================

    console.log('✅ 参数提取成功');
    console.log('标题:', title);
    console.log('正文长度:', content.length);
    console.log('图片数量:', images.length);
    console.log('标签数量:', tags.length);
    console.log('标记标签数量:', markerTags.length);
    console.log('位置:', location);
    console.log('定时发布:', scheduleAt);

    // ==================== 添加元数据 ====================

    results.push({
      json: {
        // 发布参数
        ...publishParams,

        // 附加元数据 (用于日志和调试)
        _metadata: {
          job_id: metadata.job_id,
          source_url: metadata.source_url,
          track: metadata.track,
          category: metadata.category,
          total_shops: metadata.shop_count,
          extracted_at: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    // ==================== 错误处理 ====================

    console.error('❌ 参数提取失败:', error.message);

    // 输出错误信息
    results.push({
      json: {
        error: true,
        error_message: error.message,
        job_id: metadata.job_id || null,
        source_title: metadata.source_title || null,
        failed_at: new Date().toISOString()
      }
    });
  }
}

return results;
```

---

## 使用说明

### 1. 节点配置步骤

1. **创建 Code 节点**
   - 在 N8N workflow 中添加 "Code" 节点
   - 重命名为 "提取小红书发布参数"

2. **设置执行模式**
   - Mode: `Run Once for All Items`
   - Language: `JavaScript`

3. **复制代码**
   - 将上述完整代码复制到 Code 编辑器中

4. **连接节点**
   - 输入: 连接到「查询任务数据」或「数据库查询」节点
   - 输出: 连接到「HTTP Request」节点 (调用小红书发布 API)

### 2. 输入数据格式

Code Node 期望的输入数据格式 (从数据库查询节点获取):

```json
[
  {
    "json": {
      "job_id": "e87cd905-2dbb-42d4-95a6-b317344e41b1",
      "source_title": "香港私藏Cafe",
      "track": "lifestyle",
      "category": "explore",
      "tags": ["香港咖啡", "香港探店", "精品咖啡"],
      "keywords": ["香港", "咖啡店", "探店"],
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
            "☕ 核心：全球Top25/拉花冠军/草间弥生"
          ]
        }
      ],
      "shops": [
        {
          "title": "The Coffee Academics",
          "subtitle": "入选全球25家必去咖啡店",
          "body_points": [
            "📍 地址：湾仔道225号骏逸峰地铺",
            "🕙 营业：08:00-18:00"
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
      ],
      "shop_count": "8"
    }
  }
]
```

### 3. 输出数据格式

成功提取的输出格式:

```json
[
  {
    "json": {
      "title": "香港私藏Cafe",
      "content": "8间本地人常去的宝藏店\n\n📍 坐标：香港(铜锣湾/湾仔/坚尼地城)\n☕ 核心：全球Top25/拉花冠军/草间弥生\n\n---\n\n1️⃣ The Coffee Academics\n入选全球25家必去咖啡店\n📍 地址：湾仔道225号骏逸峰地铺\n🕙 营业：08:00-18:00",
      "images": [
        "https://pub-c918abf638c7475fa46f2a62c795106f.r2.dev/images/20260125-124331-321.png",
        "https://pub-c918abf638c7475fa46f2a62c795106f.r2.dev/images/20260125-124353-309.png"
      ],
      "tags": [
        "香港咖啡",
        "香港探店",
        "精品咖啡"
      ],
      "marker_tags": [
        "冲绳黑糖咖啡",
        "草间弥生打印咖啡"
      ],
      "location": "香港 · 铜锣湾/湾仔/西营盘",
      "schedule_at": null,
      "_metadata": {
        "job_id": "e87cd905-2dbb-42d4-95a6-b317344e41b1",
        "source_url": "https://mp.weixin.qq.com/s/WhTYWcr2yjzxOlvLahH0NA",
        "track": "lifestyle",
        "category": "explore",
        "total_shops": "8",
        "extracted_at": "2026-01-26T03:30:00.000Z"
      }
    }
  }
]
```

错误输出格式:

```json
[
  {
    "json": {
      "error": true,
      "error_message": "缺少必需字段: source_title",
      "job_id": "e87cd905-2dbb-42d4-95a6-b317344e41b1",
      "source_title": null,
      "failed_at": "2026-01-26T03:30:00.000Z"
    }
  }
]
```

---

## 数据验证规则

### 必需字段验证

| 字段 | 验证规则 | 错误提示 |
|------|---------|---------|
| `source_title` | 不能为空 | "缺少必需字段: source_title" |
| `images` | 数组且长度 > 0 | "缺少必需字段: images 或图片数组为空" |
| `images[].r2_url` | 所有图片必须有 | "X 张图片缺少 r2_url" |

### 长度限制

| 字段 | 最大长度 | 超出处理 |
|------|---------|---------|
| `title` | 20 字符 | 自动截断 |
| `content` | 1000 字符 | 截断至 997 + "..." |
| `tags` | 10 个 | 取前10个 |
| `marker_tags` | 5 个 | 取前5个 |
| `location` 区域 | 3 个 | 取前3个 |

---

## 字段提取优先级

### `marker_tags` 提取优先级

1. **优先**: `meta_attributes.featured_items` (特色项目)
2. **备选**: `keywords` 的前5个

### `location` 提取逻辑

1. 有城市 + 区域: `"城市 · 区域1/区域2/区域3"`
2. 仅有城市: `"城市"`
3. 都没有: `null`

### `content` 构建顺序

1. 封面副标题 (`coverItem.subtitle`)
2. 封面要点 (`coverItem.body_points`)
3. 分隔线 (`---`)
4. 店铺列表 (`shops` 数组)

---

## 调试技巧

### 1. 查看控制台日志

Code Node 执行后，点击节点查看日志输出:

```
✅ 参数提取成功
标题: 香港私藏Cafe
正文长度: 567
图片数量: 9
标签数量: 7
标记标签数量: 2
位置: 香港 · 铜锣湾/湾仔/西营盘
定时发布: null
```

### 2. 测试单个项目

在 workflow 测试时，可以使用「Execute Node」功能:

1. 点击 Code 节点
2. 点击「Execute Node」
3. 查看输出结果

### 3. 处理错误

如果看到错误输出:

```json
{
  "error": true,
  "error_message": "缺少必需字段: source_title",
  ...
}
```

检查上游节点的数据是否完整。

---

## 后续节点配置

### HTTP Request 节点 (调用小红书 API)

```json
{
  "method": "POST",
  "url": "http://localhost:18060/api/v1/publish",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "={{ JSON.stringify($json) }}",
  "options": {
    "timeout": 30000
  }
}
```

**Body 配置**:
- 使用表达式: `={{ JSON.stringify($json) }}`
- 这会自动将 Code Node 的输出作为请求体

---

## 扩展功能

### 1. 添加定时发布逻辑

在代码中添加定时发布时间计算:

```javascript
// 根���内容类型设置发布时间
let scheduleAt = null;

if (metadata.category === 'explore' && metadata.track === 'lifestyle') {
  // 探店类内容建议周末早上 10:00 发布
  const nextSaturday = new Date();
  nextSaturday.setDate(nextSaturday.getDate() + (6 - nextSaturday.getDay()));
  nextSaturday.setHours(10, 0, 0, 0);
  scheduleAt = nextSaturday.toISOString();
}
```

### 2. 添加标签优化

根据小红书热门标签调整顺序:

```javascript
// 热门标签优先
const hotTags = ['香港探店', '周末打卡', '咖啡地图'];
tags.sort((a, b) => {
  const aHot = hotTags.includes(a) ? 1 : 0;
  const bHot = hotTags.includes(b) ? 1 : 0;
  return bHot - aHot;
});
```

### 3. 添加内容优化

智能截断正文，优先保留重要信息:

```javascript
if (content.length > 1000) {
  // 优先保留封面信息 + 前3个店铺
  const coverPart = content.split('---')[0];
  const shopsLimited = metadata.shops.slice(0, 3);
  // 重新构建 content...
}
```

---

## 常见问题

### Q1: 图片顺序错乱怎么办？

A: 代码已经按 `index` 字段排序:
```javascript
.sort((a, b) => a.index - b.index)
```
确保数据库中的 `index` 字段正确。

### Q2: 如何处理缺少封面页的情况？

A: 代码已经做了安全检查:
```javascript
const coverItem = metadata.content_items?.find(item => item.type === 'cover');
if (coverItem) {
  // 处理封面
}
```
如果没有封面，会跳过封面部分，直接添加店铺列表。

### Q3: 正文超过1000字符会怎样？

A: 自动截断至 997 字符并添加 "...":
```javascript
if (content.length > 1000) {
  content = content.slice(0, 997) + '...';
}
```

### Q4: 如何查看提取失败的原因？

A: 查看输出的 `error_message` 字段:
```json
{
  "error": true,
  "error_message": "缺少必需字段: images 或图片数组为空"
}
```

---

## 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| 1.0.0 | 2026-01-26 | 初始版本，支持基础参数提取 |

---

## 相关文档

- [参数映射规范](./xhs-publish-param-mapping.md)
- [小红书 API 文档](./doc.json)
- [元数据结构说明](./metaData.markdown)
