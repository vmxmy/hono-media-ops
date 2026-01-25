# N8N 小红书发布参数生成 - Code 节点实现

## 节点配置

**节点类型**: Code (JavaScript)
**位置**: 发布 Workflow 中，位于「查询任务数据」节点之后，「调用小红书 API」节点之前

---

## 完整代码

```javascript
const items = $input.all();

// ============================================
// 常量配置
// ============================================

// 内容类型推荐发布时间表
const PUBLISH_SCHEDULE = {
  explore: { day: 5, hour: 18, minute: 0 },    // 周五 18:00（探店）
  tutorial: { day: 2, hour: 10, minute: 0 },   // 周二 10:00（教程）
  review: { day: 3, hour: 20, minute: 0 },     // 周三 20:00（测评）
  knowledge: { day: 1, hour: 8, minute: 0 },   // 周一 08:00（干货）
};

// 内容类型关键词映射
const CATEGORY_KEYWORDS = {
  explore: ['探店', '打卡', '地图', '宝藏', '私藏'],
  tutorial: ['教程', '制作', '步骤', '教你', '学会'],
  review: ['测评', '推荐', '好物', '种草', '分享'],
  knowledge: ['干货', '科普', '必看', '了解', '知识']
};

// ============================================
// 辅助函数
// ============================================

/**
 * 生成优化后的标题
 */
function generateTitle(data) {
  // 优先级1: 封面标题
  const coverConfig = data.generated_config?.find(item => item.type === 'cover');
  if (coverConfig?.title && coverConfig.title.length >= 10) {
    return coverConfig.title;
  }

  // 优先级2: source_title
  if (data.source_title) {
    return data.source_title;
  }

  // 优先级3: 基于元数据生成
  const city = data.meta_attributes?.location_summary?.city || '';
  const totalShops = data.meta_attributes?.location_summary?.total_shops || 0;
  const shopTypes = data.meta_attributes?.shop_types?.[0] || '店铺';

  if (city && totalShops > 0) {
    return `${city}${totalShops}家${shopTypes}｜本地人推荐`;
  }

  return 'Untitled';
}

/**
 * 生成正文内容
 */
function generateContent(data) {
  const parts = [];
  const coverConfig = data.generated_config?.find(item => item.type === 'cover');
  const contentItems = data.generated_config?.filter(item => item.type === 'content') || [];

  // 钩子句
  if (coverConfig?.subtitle) {
    parts.push(coverConfig.subtitle);
    parts.push('');
  }

  // 核心信息（探店类）
  if (data.category === 'explore' && data.meta_attributes?.location_summary) {
    const loc = data.meta_attributes.location_summary;
    const meta = data.meta_attributes;

    parts.push(`📍 坐标：${loc.city}${loc.districts ? `（${loc.districts.slice(0, 3).join('/')}`）: ''}`);

    if (meta.shop_types?.length > 0) {
      parts.push(`☕ 类型：${meta.shop_types.join('·')}`);
    }

    if (meta.price_range) {
      parts.push(`💰 人均：${meta.price_range}元`);
    }

    if (meta.common_features?.length > 0) {
      parts.push(`✨ 特色：${meta.common_features.slice(0, 3).join('·')}`);
    }

    parts.push('');
    parts.push('---');
    parts.push('');
  }

  // 详细列表
  if (contentItems.length > 0) {
    parts.push('【推荐清单】');
    parts.push('');

    contentItems.slice(0, 10).forEach((item, idx) => {
      const emoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][idx];
      parts.push(`${emoji} ${item.title}`);

      if (item.subtitle) {
        parts.push(item.subtitle);
      }

      // 提取地址、时间、必点（探店类）
      if (item.body_points && item.body_points.length > 0) {
        item.body_points.slice(0, 3).forEach(point => {
          parts.push(point);
        });
      }

      parts.push('');
    });

    parts.push('---');
    parts.push('');
  }

  // 互动引导
  parts.push('💬 你去过哪几家？评论区分享你的私藏！');
  parts.push('❤️ 觉得有用记得点赞收藏哦～');

  return parts.join('\n');
}

/**
 * 筛选话题标签
 */
function selectTags(data) {
  if (!data.tags || data.tags.length === 0) {
    return [];
  }

  const city = data.meta_attributes?.location_summary?.city || '';
  const category = data.category || '';
  const categoryKws = CATEGORY_KEYWORDS[category] || [];

  // 按优先级排序
  const scoredTags = data.tags.map(tag => {
    let score = 0;

    // 1. 包含城市名（最高优先级）
    if (city && tag.includes(city)) {
      score += 100;
    }

    // 2. 匹配内容类型关键词
    if (categoryKws.some(kw => tag.includes(kw))) {
      score += 50;
    }

    // 3. 高频场景词
    const scenarioWords = ['周末', '假期', '约会', '拍照', '打卡', '必去', '推荐'];
    if (scenarioWords.some(kw => tag.includes(kw))) {
      score += 30;
    }

    // 4. 包含具体品类词
    const specificWords = ['咖啡', '甜品', '美食', '民宿', '景点'];
    if (specificWords.some(kw => tag.includes(kw))) {
      score += 20;
    }

    return { tag, score };
  });

  // 按分数排序，取前5个
  return scoredTags
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.tag);
}

/**
 * 提取图片 URL
 */
function extractImageUrls(data) {
  if (!data.images || data.images.length === 0) {
    throw new Error('No images available');
  }

  return data.images
    .filter(img => img.r2_url)
    .sort((a, b) => a.index - b.index)
    .slice(0, 9)  // 小红书最多9张
    .map(img => img.r2_url);
}

/**
 * 生成定时发布时间（可选）
 */
function generateScheduleTime(data, enableSchedule = false) {
  if (!enableSchedule) {
    return null;
  }

  const category = data.category || 'explore';
  const schedule = PUBLISH_SCHEDULE[category] || PUBLISH_SCHEDULE.explore;

  const now = new Date();
  const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

  // 计算到目标星期几的天数差
  let daysUntilTarget = (schedule.day - currentDay + 7) % 7;

  // 如果是今天且已过推荐时间，则推到下周同一天
  if (daysUntilTarget === 0) {
    const targetTime = new Date(now);
    targetTime.setHours(schedule.hour, schedule.minute, 0, 0);
    if (now > targetTime) {
      daysUntilTarget = 7;
    }
  }

  // 如果差值为0（今天且未到时间），保持今天
  if (daysUntilTarget === 0) {
    daysUntilTarget = 0;
  }

  const scheduledDate = new Date(now);
  scheduledDate.setDate(now.getDate() + daysUntilTarget);
  scheduledDate.setHours(schedule.hour, schedule.minute, 0, 0);

  // 返回 ISO8601 格式，时区 +08:00
  const isoString = scheduledDate.toISOString();
  return isoString.replace('Z', '+08:00');
}

/**
 * 质量检查
 */
function validateOutput(output) {
  const errors = [];

  // 标题检查
  if (!output.title || output.title.length < 5) {
    errors.push('Title too short (min 5 characters)');
  }
  if (output.title.length > 50) {
    errors.push('Title too long (max 50 characters)');
  }

  // 正文检查
  if (!output.content || output.content.length < 100) {
    errors.push('Content too short (min 100 characters)');
  }
  if (output.content.length > 2000) {
    errors.push('Content too long (max 2000 characters)');
  }

  // 图片检查
  if (!output.images || output.images.length === 0) {
    errors.push('No images provided');
  }
  if (output.images && output.images.length > 9) {
    errors.push('Too many images (max 9)');
  }

  // 标签检查
  if (output.tags && output.tags.length > 10) {
    errors.push('Too many tags (max 10)');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}

// ============================================
// 主处理逻辑
// ============================================

const results = items.map(item => {
  const data = item.json;

  try {
    // 生成发布参数
    const publishParams = {
      title: generateTitle(data),
      content: generateContent(data),
      images: extractImageUrls(data),
      tags: selectTags(data),
    };

    // 可选：定时发布（根据环境变量或输入参数决定）
    const enableSchedule = data.enable_schedule || false;
    if (enableSchedule) {
      publishParams.schedule_at = generateScheduleTime(data, true);
    }

    // 质量检查
    validateOutput(publishParams);

    // 返回结果
    return {
      json: {
        job_id: data.job_id,
        publish_params: publishParams,
        meta: {
          category: data.category,
          track: data.track,
          total_images: data.images?.length || 0,
          selected_tags_count: publishParams.tags.length,
        },
      },
    };
  } catch (error) {
    // 错误处理
    return {
      json: {
        job_id: data.job_id,
        error: error.message,
        publish_params: null,
      },
    };
  }
});

return results;
```

---

## 输入示例

```json
{
  "job_id": "e87cd905-2dbb-42d4-95a6-b317344e41b1",
  "source_title": "香港私藏Cafe",
  "category": "explore",
  "track": "lifestyle",
  "tags": ["香港咖啡", "香港探店", "周末打卡", "咖啡地图"],
  "meta_attributes": {
    "location_summary": {
      "city": "香港",
      "districts": ["铜锣湾", "湾仔", "坚尼地城"],
      "total_shops": 8
    },
    "shop_types": ["精品咖啡店", "艺术咖啡厅"],
    "price_range": "35-88"
  },
  "generated_config": [
    {
      "type": "cover",
      "title": "香港私藏Cafe",
      "subtitle": "8间本地人常去的宝藏店"
    },
    {
      "type": "content",
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
    { "index": 1, "type": "cover", "r2_url": "https://r2.example.com/1.png" },
    { "index": 2, "type": "content", "r2_url": "https://r2.example.com/2.png" }
  ]
}
```

---

## 输出示例

```json
{
  "job_id": "e87cd905-2dbb-42d4-95a6-b317344e41b1",
  "publish_params": {
    "title": "香港私藏Cafe",
    "content": "8间本地人常去的宝藏店\n\n📍 坐标：香港（铜锣湾/湾仔/坚尼地城）\n☕ 类型：精品咖啡店·艺术咖啡厅\n💰 人均：35-88元\n\n---\n\n【推荐清单】\n\n1️⃣ The Coffee Academics\n入选全球25家必去咖啡店\n📍 地址：湾仔道225号骏逸峰地铺\n🕙 营业：08:00-18:00\n🍰 必点：冲绳黑糖咖啡\n\n---\n\n💬 你去过哪几家？评论区分享你的私藏！\n❤️ 觉得有用记得点赞收藏哦～",
    "images": [
      "https://r2.example.com/1.png",
      "https://r2.example.com/2.png"
    ],
    "tags": ["香港咖啡", "香港探店", "周末打卡", "咖啡地图"]
  },
  "meta": {
    "category": "explore",
    "track": "lifestyle",
    "total_images": 2,
    "selected_tags_count": 4
  }
}
```

---

## 环境变量（可选）

在 N8N 中配置：

| 变量名 | 说明 | 默认值 |
|-------|------|--------|
| `XHS_ENABLE_SCHEDULE` | 是否启用定时发布 | `false` |
| `XHS_MAX_IMAGES` | 最大图片数量 | `9` |
| `XHS_MAX_TAGS` | 最大标签数量 | `5` |

---

## 下游节点连接

### HTTP Request 节点（调用小红书 API）

**节点配置**：
- **Method**: POST
- **URL**: `http://localhost:18060/api/v1/publish`
- **Authentication**: None
- **Body**: JSON

**Body 映射**：
```javascript
{
  "title": "={{ $json.publish_params.title }}",
  "content": "={{ $json.publish_params.content }}",
  "images": "={{ $json.publish_params.images }}",
  "tags": "={{ $json.publish_params.tags }}",
  "schedule_at": "={{ $json.publish_params.schedule_at }}"
}
```

---

## 错误处理

### Switch 节点（检查错误）

**条件**：
```javascript
{{ $json.error !== undefined }}
```

**分支**：
1. **有错误** → 发送通知/记录日志
2. **无错误** → 继续发布流程

---

## 优化建议

### 1. 缓存机制

在 Code 节点前添加 Redis 节点，缓存已生成的参数：

```javascript
// 检查缓存
const cacheKey = `xhs:publish:${data.job_id}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

// 生成参数...

// 存入缓存（24小时）
await redis.setex(cacheKey, 86400, JSON.stringify(publishParams));
```

### 2. A/B 测试

生成多个标题变体供人工选择：

```javascript
const titleVariants = [
  generateTitle(data),  // 原始版本
  `${city}${totalShops}家${shopType}｜${feature}`,  // 数字化版本
  `这些${shopType}，${city}本地人从不告诉游客`,  // 悬念版本
];

publishParams.title_variants = titleVariants;
```

### 3. 内容审核

添加敏感词检测：

```javascript
const SENSITIVE_WORDS = ['广告', '加微信', '代购'];

function containsSensitiveWords(text) {
  return SENSITIVE_WORDS.some(word => text.includes(word));
}

if (containsSensitiveWords(publishParams.content)) {
  throw new Error('Content contains sensitive words');
}
```

---

## 测试用例

### 测试 1：探店类内容

```bash
node --eval "
const input = { ... };  // 完整输入
const result = generatePublishParams(input);
console.log(JSON.stringify(result, null, 2));
"
```

### 测试 2：缺失元数据

```javascript
// 输入缺少 meta_attributes
const input = {
  job_id: "test-123",
  source_title: "测试标题",
  tags: [],
  images: [{ r2_url: "https://..." }]
};

// 预期：使用降级策略生成基础参数
```

---

## 监控指标

在 N8N workflow 中添加监控节点：

```javascript
{
  "job_id": "{{ $json.job_id }}",
  "metrics": {
    "title_length": "={{ $json.publish_params.title.length }}",
    "content_length": "={{ $json.publish_params.content.length }}",
    "image_count": "={{ $json.publish_params.images.length }}",
    "tag_count": "={{ $json.publish_params.tags.length }}",
    "has_schedule": "={{ $json.publish_params.schedule_at !== null }}",
    "processing_time_ms": "={{ $now.diff($workflow.startedAt) }}"
  }
}
```
