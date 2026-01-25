# N8N 小红书发布数据转换器 - Code 节点实现

## 设计理念

**职责分离**：
- ✅ **Code 节点**：确定性数据转换（图片提取、标签筛选、格式化）
- ✅ **AI 节点**：创意性内容生成（标题优化、正文润色）

**优势**：
- 成本低（减少 AI token 消耗）
- 速度快（本地代码执行）
- 可控性强（逻辑清晰可调试）
- 易维护（代码比 prompt 更稳定）

---

## 架构设计

```
查询任务数据
    ↓
[Code 1] 数据转换器 ← 本文档
    ├─ 提取图片 URL
    ├─ 筛选话题标签
    ├─ 生成基础标题
    ├─ 构建正文框架
    └─ 格式化 AI 变量
    ↓
[AI] 内容优化（可选）
    ├─ 润色标题
    └─ 补充文案细节
    ↓
[Code 2] 最终组装
    ↓
调用小红书 API
```

---

## 完整代码实现

### Code 节点 1: 数据转换器

```javascript
const items = $input.all();

// ============================================
// 常量配置
// ============================================

// 标签打分权重
const TAG_SCORE_WEIGHTS = {
  HAS_CITY: 100,           // 包含城市名
  CATEGORY_MATCH: 50,      // 匹配内容类型
  SCENARIO: 30,            // 场景词
  SPECIFIC: 20,            // 具体品类
};

// 内容类型关键词
const CATEGORY_KEYWORDS = {
  explore: ['探店', '打卡', '地图', '宝藏', '私藏', '必去'],
  tutorial: ['教程', '制作', '步骤', '教你', '学会', '手把手'],
  review: ['测评', '推荐', '好物', '种草', '分享', '实测'],
  knowledge: ['干货', '科普', '必看', '了解', '知识', '避坑'],
};

// 高频场景词
const SCENARIO_WORDS = [
  '周末', '假期', '约会', '拍照', '打卡', '必去',
  '推荐', '新店', '网红', '小众', '宝藏', '私藏'
];

// 具体品类词
const SPECIFIC_WORDS = [
  '咖啡', '甜品', '美食', '民宿', '景点', '餐厅',
  '酒吧', '书店', '展览', '博物馆', '公园'
];

// ============================================
// 核心功能函数
// ============================================

/**
 * 1. 提取图片 URL 列表
 * 规则：
 * - 过滤掉没有 r2_url 的图片
 * - 按 index 排序
 * - 限制最多 9 张（小红书限制）
 * - 优先保留封面图
 */
function extractImageUrls(data) {
  if (!data.images || data.images.length === 0) {
    throw new Error('No images available for job: ' + data.job_id);
  }

  // 按 index 排序
  const sortedImages = data.images
    .filter(img => img.r2_url)
    .sort((a, b) => a.index - b.index);

  // 如果超过 9 张，优先保留封面
  if (sortedImages.length > 9) {
    const cover = sortedImages.find(img => img.type === 'cover');
    const content = sortedImages.filter(img => img.type === 'content').slice(0, 8);

    return cover
      ? [cover, ...content].map(img => img.r2_url)
      : sortedImages.slice(0, 9).map(img => img.r2_url);
  }

  return sortedImages.map(img => img.r2_url);
}

/**
 * 2. 智能筛选话题标签
 * 打分机制：
 * - 城市名 +100
 * - 类型匹配 +50
 * - 场景词 +30
 * - 品类词 +20
 */
function selectTags(data) {
  if (!data.tags || data.tags.length === 0) {
    // 降级：从 keywords 生成
    return data.keywords ? data.keywords.slice(0, 3) : [];
  }

  const city = data.meta_attributes?.location_summary?.city || '';
  const category = data.category || '';
  const categoryKws = CATEGORY_KEYWORDS[category] || [];

  // 为每个标签打分
  const scoredTags = data.tags.map(tag => {
    let score = 0;

    // 1. 包含城市名（最高优先级）
    if (city && tag.includes(city)) {
      score += TAG_SCORE_WEIGHTS.HAS_CITY;
    }

    // 2. 匹配内容类型关键词
    if (categoryKws.some(kw => tag.includes(kw))) {
      score += TAG_SCORE_WEIGHTS.CATEGORY_MATCH;
    }

    // 3. 高频场景词
    if (SCENARIO_WORDS.some(kw => tag.includes(kw))) {
      score += TAG_SCORE_WEIGHTS.SCENARIO;
    }

    // 4. 具体品类词
    if (SPECIFIC_WORDS.some(kw => tag.includes(kw))) {
      score += TAG_SCORE_WEIGHTS.SPECIFIC;
    }

    return { tag, score };
  });

  // 排序并取前 5 个
  return scoredTags
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.tag);
}

/**
 * 3. 生成基础标题
 * 优先级：
 * 1. generated_config 封面标题
 * 2. source_title
 * 3. 基于元数据自动生成
 */
function generateBaseTitle(data) {
  // 优先级 1: 封面标题
  const coverConfig = data.generated_config?.find(item => item.type === 'cover');
  if (coverConfig?.title && coverConfig.title.length >= 10) {
    return coverConfig.title;
  }

  // 优先级 2: source_title
  if (data.source_title && data.source_title.length >= 10) {
    return data.source_title;
  }

  // 优先级 3: 基于元数据生成
  const category = data.category;

  if (category === 'explore' && data.meta_attributes?.location_summary) {
    const loc = data.meta_attributes.location_summary;
    const shopType = data.meta_attributes.shop_types?.[0] || '店铺';
    return `${loc.city}${loc.total_shops}家${shopType}`;
  }

  if (category === 'review' && data.meta_attributes?.product_name) {
    return `${data.meta_attributes.product_name}测评`;
  }

  if (category === 'tutorial' && data.meta_attributes?.title) {
    return `${data.meta_attributes.title}教程`;
  }

  if (category === 'knowledge' && data.meta_attributes?.topic) {
    return `${data.meta_attributes.topic}干货`;
  }

  return data.source_title || 'Untitled';
}

/**
 * 4. 构建正文框架
 * 根据 category 生成不同的框架结构
 */
function buildContentFramework(data) {
  const category = data.category;

  if (category === 'explore') {
    return buildExploreContent(data);
  }

  if (category === 'review') {
    return buildReviewContent(data);
  }

  if (category === 'tutorial') {
    return buildTutorialContent(data);
  }

  if (category === 'knowledge') {
    return buildKnowledgeContent(data);
  }

  // 默认简单框架
  return buildDefaultContent(data);
}

/**
 * 4.1 探店类正文框架
 */
function buildExploreContent(data) {
  const parts = [];
  const coverConfig = data.generated_config?.find(c => c.type === 'cover');
  const contentItems = data.generated_config?.filter(c => c.type === 'content') || [];

  // 钩子句
  if (coverConfig?.subtitle) {
    parts.push(coverConfig.subtitle);
    parts.push('');
  }

  // 核心信息
  if (data.meta_attributes?.location_summary) {
    const loc = data.meta_attributes.location_summary;
    const meta = data.meta_attributes;

    parts.push(`📍 坐标：${loc.city}${loc.districts ? `（${loc.districts.slice(0, 3).join('/')})` : ''}`);

    if (meta.shop_types?.length > 0) {
      parts.push(`☕ 类型：${meta.shop_types.slice(0, 3).join('·')}`);
    }

    if (meta.price_range) {
      parts.push(`💰 人均：${meta.price_range}元`);
    }

    if (meta.common_features?.length > 0) {
      parts.push(`✨ 特色：${meta.common_features.slice(0, 4).join('·')}`);
    }

    parts.push('');
    parts.push('---');
    parts.push('');
  }

  // 店铺列表
  if (contentItems.length > 0) {
    parts.push('【推荐清单】');
    parts.push('');

    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    contentItems.slice(0, 10).forEach((item, idx) => {
      parts.push(`${emojis[idx]} ${item.title}`);

      if (item.subtitle) {
        parts.push(item.subtitle);
      }

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
  parts.push('💬 你去过哪几家？评论区分享～');
  parts.push('❤️ 觉得有用记得点赞收藏！');

  return parts.join('\n');
}

/**
 * 4.2 测评类正文框架
 */
function buildReviewContent(data) {
  const parts = [];
  const meta = data.meta_attributes || {};

  // 总结性评价
  if (meta.rating) {
    parts.push(`⭐ 综合评分：${meta.rating}/5`);
    parts.push('');
  }

  // 优点
  if (meta.pros && meta.pros.length > 0) {
    parts.push('【优点】');
    meta.pros.forEach(pro => parts.push(`✅ ${pro}`));
    parts.push('');
  }

  // 缺点
  if (meta.cons && meta.cons.length > 0) {
    parts.push('【缺点】');
    meta.cons.forEach(con => parts.push(`❌ ${con}`));
    parts.push('');
  }

  // 购买建议
  if (meta.suitable_for && meta.suitable_for.length > 0) {
    parts.push(`💡 适合人群：${meta.suitable_for.join('、')}`);
  }

  if (meta.repurchase !== undefined) {
    parts.push(`🔄 回购意愿：${meta.repurchase ? '会回购' : '不会回购'}`);
  }

  parts.push('');
  parts.push('---');
  parts.push('');
  parts.push('💬 你用过吗？说说你的感受～');
  parts.push('❤️ 觉得有用记得点赞收藏！');

  return parts.join('\n');
}

/**
 * 4.3 教程类正文框架
 */
function buildTutorialContent(data) {
  const parts = [];
  const meta = data.meta_attributes || {};
  const contentItems = data.generated_config?.filter(c => c.type === 'content') || [];

  // 难度和时间
  if (meta.difficulty || meta.time_required) {
    parts.push(`📋 难度：${meta.difficulty || '简单'} | ⏱ 时间：${meta.time_required || '未知'}`);
    parts.push('');
  }

  // 材料清单
  if (meta.materials_needed && meta.materials_needed.length > 0) {
    parts.push('【所需材料】');
    meta.materials_needed.forEach(material => parts.push(`📦 ${material}`));
    parts.push('');
  }

  // 步骤
  if (contentItems.length > 0) {
    parts.push('【制作步骤】');
    parts.push('');

    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    contentItems.forEach((step, idx) => {
      parts.push(`${emojis[idx]} ${step.title}`);
      if (step.subtitle) {
        parts.push(step.subtitle);
      }
      parts.push('');
    });
  }

  parts.push('---');
  parts.push('');
  parts.push('💬 你试了吗？晒图打卡吧～');
  parts.push('❤️ 觉得有用记得点赞收藏！');

  return parts.join('\n');
}

/**
 * 4.4 干货科普类正文框架
 */
function buildKnowledgeContent(data) {
  const parts = [];
  const meta = data.meta_attributes || {};
  const contentItems = data.generated_config?.filter(c => c.type === 'content') || [];

  // 核心要点
  if (meta.key_points && meta.key_points.length > 0) {
    parts.push('【核心要点】');
    meta.key_points.forEach(point => parts.push(`📚 ${point}`));
    parts.push('');
  }

  // 常见误区
  if (meta.myths_busted && meta.myths_busted.length > 0) {
    parts.push('【常见误区】');
    meta.myths_busted.forEach(myth => parts.push(`❌ ${myth}`));
    parts.push('');
  }

  // 实用建议
  if (meta.actionable_tips && meta.actionable_tips.length > 0) {
    parts.push('【实用建议】');
    meta.actionable_tips.forEach(tip => parts.push(`✅ ${tip}`));
    parts.push('');
  }

  // 详细内容
  if (contentItems.length > 0) {
    parts.push('【详细解析】');
    parts.push('');

    contentItems.forEach((item, idx) => {
      parts.push(`${idx + 1}. ${item.title}`);
      if (item.subtitle) {
        parts.push(item.subtitle);
      }
      parts.push('');
    });
  }

  parts.push('---');
  parts.push('');
  parts.push('💬 你还想了解什么？评论区告诉我～');
  parts.push('❤️ 觉得有用记得点赞收藏！');

  return parts.join('\n');
}

/**
 * 4.5 默认框架
 */
function buildDefaultContent(data) {
  const parts = [];
  const contentItems = data.generated_config?.filter(c => c.type === 'content') || [];

  if (contentItems.length > 0) {
    contentItems.forEach((item, idx) => {
      parts.push(`${idx + 1}. ${item.title}`);
      if (item.subtitle) {
        parts.push(item.subtitle);
      }
      parts.push('');
    });
  }

  parts.push('---');
  parts.push('');
  parts.push('💬 欢迎评论区交流～');
  parts.push('❤️ 觉得有用记得点赞收藏！');

  return parts.join('\n');
}

/**
 * 5. 格式化 AI 输入变量（如果需要 AI 优化）
 */
function formatAIVariables(data, baseTitle, baseContent) {
  return {
    category: data.category,
    base_title: baseTitle,
    base_content: baseContent,
    city: data.meta_attributes?.location_summary?.city || '',
    keywords: data.keywords?.slice(0, 5).join(', ') || '',
    total_shops: data.meta_attributes?.location_summary?.total_shops || 0,
  };
}

/**
 * 6. 数据验证
 */
function validateOutput(output) {
  const errors = [];

  if (!output.images || output.images.length === 0) {
    errors.push('No images');
  }

  if (output.images && output.images.length > 9) {
    errors.push('Too many images (max 9)');
  }

  if (!output.title || output.title.length < 5) {
    errors.push('Title too short');
  }

  if (!output.content || output.content.length < 50) {
    errors.push('Content too short');
  }

  if (output.tags && output.tags.length > 10) {
    errors.push('Too many tags');
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
    // 1. 提取图片 URL
    const images = extractImageUrls(data);

    // 2. 筛选话题标签
    const tags = selectTags(data);

    // 3. 生成基础标题
    const baseTitle = generateBaseTitle(data);

    // 4. 构建正文框架
    const baseContent = buildContentFramework(data);

    // 5. 组装输出
    const output = {
      // 小红书 API 所需参数
      title: baseTitle,
      content: baseContent,
      images: images,
      tags: tags,

      // 元数据（用于下游处理）
      meta: {
        job_id: data.job_id,
        category: data.category,
        track: data.track,
        total_images: images.length,
        selected_tags_count: tags.length,
        content_length: baseContent.length,
      },

      // AI 优化变量（如果需要）
      ai_variables: formatAIVariables(data, baseTitle, baseContent),
    };

    // 6. 验证
    validateOutput(output);

    return { json: output };

  } catch (error) {
    return {
      json: {
        error: error.message,
        job_id: data.job_id,
      },
    };
  }
});

return results;
```

---

## 输出数据结构

```json
{
  "title": "香港私藏Cafe",
  "content": "8间本地人常去的宝藏店\n\n📍 坐标：香港（铜锣湾/湾仔/坚尼地城）\n☕ 类型：精品咖啡店·艺术咖啡厅\n...",
  "images": [
    "https://r2.example.com/1.png",
    "https://r2.example.com/2.png"
  ],
  "tags": ["香港咖啡", "香港探店", "周末打卡"],
  "meta": {
    "job_id": "e87cd905-...",
    "category": "explore",
    "track": "lifestyle",
    "total_images": 9,
    "selected_tags_count": 3,
    "content_length": 856
  },
  "ai_variables": {
    "category": "explore",
    "base_title": "香港私藏Cafe",
    "base_content": "...",
    "city": "香港",
    "keywords": "香港, 咖啡, 探店",
    "total_shops": 8
  }
}
```

---

## 下游节点连接

### 选项 1：直接发布（不使用 AI）

```
[Code 1] 数据转换器
    ↓
[HTTP Request] POST http://localhost:18060/api/v1/publish
    Body: {
      "title": "{{ $json.title }}",
      "content": "{{ $json.content }}",
      "images": "={{ $json.images }}",
      "tags": "={{ $json.tags }}"
    }
```

### 选项 2：AI 优化后发布

```
[Code 1] 数据转换器
    ↓
[AI] 优化标题和正文
    System: "润色标题，保持 10-25 字"
    User: "原标题：{{ $json.title }}\n类型：{{ $json.ai_variables.category }}\n关键词：{{ $json.ai_variables.keywords }}"
    ↓
[Code 2] 合并结果
    {
      "title": "{{ $json.ai_optimized_title || $('Code 1').first().json.title }}",
      "content": "{{ $json.ai_optimized_content || $('Code 1').first().json.content }}",
      "images": "={{ $('Code 1').first().json.images }}",
      "tags": "={{ $('Code 1').first().json.tags }}"
    }
    ↓
[HTTP Request] 发布
```

---

## 优化建议

### 1. 缓存机制

```javascript
// 在主逻辑前添加
const cacheKey = `xhs:transform:${data.job_id}`;
const cached = await $redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

// ... 执行转换 ...

// 缓存结果（1小时）
await $redis.setex(cacheKey, 3600, JSON.stringify(output));
```

### 2. 标签去重优化

```javascript
function selectTags(data) {
  // ... 原有逻辑 ...

  // 去除包含关系的重复标签
  const deduped = [];
  scoredTags.forEach(item => {
    const isDuplicate = deduped.some(existing =>
      item.tag.includes(existing.tag) || existing.tag.includes(item.tag)
    );
    if (!isDuplicate) {
      deduped.push(item);
    }
  });

  return deduped.slice(0, 5).map(item => item.tag);
}
```

### 3. 动态 Emoji 选择

```javascript
const EMOJI_MAP = {
  explore: {
    location: '📍',
    type: '☕',
    price: '💰',
    feature: '✨',
  },
  tutorial: {
    difficulty: '📋',
    time: '⏱',
    materials: '📦',
    step: '🔢',
  },
  review: {
    rating: '⭐',
    pros: '✅',
    cons: '❌',
    suitable: '💡',
  },
  knowledge: {
    point: '📚',
    myth: '❌',
    tip: '✅',
  },
};

// 在框架函数中使用
const emoji = EMOJI_MAP[category];
parts.push(`${emoji.location} 坐标：${loc.city}`);
```

---

## 测试用例

### 测试 1：探店类完整数据

```javascript
const testData = {
  job_id: "test-explore-001",
  category: "explore",
  source_title: "香港私藏Cafe",
  tags: ["香港咖啡", "香港探店", "周末打卡", "咖啡地图", "网红咖啡"],
  keywords: ["香港", "咖啡", "探店", "打卡"],
  meta_attributes: {
    location_summary: {
      city: "香港",
      districts: ["铜锣湾", "湾仔", "坚尼地城"],
      total_shops: 8
    },
    shop_types: ["精品咖啡店", "艺术咖啡厅"],
    price_range: "35-88",
    common_features: ["工业风", "海景", "拍照"]
  },
  generated_config: [
    {
      type: "cover",
      title: "香港私藏Cafe",
      subtitle: "8间本地人常去的宝藏店"
    },
    {
      type: "content",
      title: "The Coffee Academics",
      subtitle: "全球25家必去咖啡店之一",
      body_points: [
        "📍 地址：湾仔道225号",
        "🕙 营业：08:00-18:00",
        "🍰 必点：冲绳黑糖咖啡"
      ]
    }
  ],
  images: [
    { index: 1, type: "cover", r2_url: "https://r2.dev/1.png" },
    { index: 2, type: "content", r2_url: "https://r2.dev/2.png" }
  ]
};

// 预期输出
// - images: 2 个 URL
// - tags: ["香港咖啡", "香港探店", "周末打卡"]
// - title: "香港私藏Cafe"
// - content: 包含完整框架（坐标、类型、店铺列表、互动引导）
```

### 测试 2：缺失元数据降级

```javascript
const testData = {
  job_id: "test-minimal-001",
  category: "explore",
  source_title: "测试标题",
  tags: [],  // 空标签
  keywords: ["咖啡", "探店"],
  meta_attributes: null,  // 缺失元数据
  generated_config: [],
  images: [
    { index: 1, type: "cover", r2_url: "https://r2.dev/1.png" }
  ]
};

// 预期输出
// - images: 1 个 URL
// - tags: ["咖啡", "探店"] (从 keywords 降级)
// - title: "测试标题"
// - content: 使用默认框架
```

---

## 监控指标

```javascript
// 在返回结果前添加监控
const metrics = {
  job_id: data.job_id,
  processing_time_ms: Date.now() - startTime,
  images_extracted: images.length,
  tags_selected: tags.length,
  title_length: baseTitle.length,
  content_length: baseContent.length,
  has_meta_attributes: !!data.meta_attributes,
  category: data.category,
};

// 发送到监控系统（可选）
// await sendMetrics(metrics);
```

---

## 性能优化

### 批量处理

如果一次处理多个任务：

```javascript
// 并行处理
const results = await Promise.all(
  items.map(async item => {
    try {
      const output = await processItem(item.json);
      return { json: output };
    } catch (error) {
      return { json: { error: error.message, job_id: item.json.job_id } };
    }
  })
);

return results;
```

### 内存优化

对于大量图片：

```javascript
// 使用流式处理
function extractImageUrls(data) {
  const imageUrls = [];

  for (let i = 0; i < Math.min(data.images.length, 9); i++) {
    const img = data.images[i];
    if (img.r2_url) {
      imageUrls.push(img.r2_url);
    }
  }

  return imageUrls;
}
```

---

## 总结

### Code 节点负责（确定性逻辑）

✅ **数据提取**
- 图片 URL 列表
- 元数据字段

✅ **智能筛选**
- 话题标签打分排序
- 图片数量限制

✅ **内容生成**
- 基础标题
- 正文框架（按类型）

✅ **数据验证**
- 字段完整性
- 长度限制

### AI 节点负责（可选，创意性）

⚠️ **内容优化**
- 标题润色
- 文案补充

### 优势对比

| 维度 | 纯 Code | Code + AI |
|------|---------|-----------|
| 成本 | 免费 | 0.01-0.05元/次 |
| 速度 | <100ms | 1-3秒 |
| 质量 | 标准化 | 更有创意 |
| 可控性 | 100% | 80% |
| 适用场景 | 批量发布 | 重点内容 |
