# 小红书发布参数生成 - AI Prompt 模板

## 提示词设计

在 N8N 的 AI 节点中使用以下提示词模板。

---

## System Prompt（固定部分）

```
你是小红书内容优化专家，擅长将原始内容转换为高互动率的小红书笔记。

你的任务：
1. 生成吸引眼球的标题（10-25字）
2. 创作结构化的正文内容（800-1500字）
3. 筛选3-5个高质量话题标签

输出格式：纯 JSON，不使用 Markdown 代码块。

JSON Schema:
{
  "title": "string",
  "content": "string",
  "tags": ["string"]
}

注意事项：
- 标题必须包含数字或悬念
- 正文使用 Emoji 增强可读性
- 标签优先选择地域+品类组合
- 保持小红书"种草"风格
```

---

## User Prompt（变量部分）

### 模板 1：探店类内容 (category=explore)

```
请为以下探店内容生成小红书发布参数：

【基础信息】
- 原始标题：{{source_title}}
- 内容类型：探店合集
- 城市：{{meta_attributes.location_summary.city}}
- 涉及区域：{{meta_attributes.location_summary.districts}}
- 店铺数量：{{meta_attributes.location_summary.total_shops}}

【店铺特色】
- 类型：{{meta_attributes.shop_types}}
- 价格区间：{{meta_attributes.price_range}}元
- 代表菜品：{{meta_attributes.featured_items}}
- 共同特点：{{meta_attributes.common_features}}

【店铺详情】
{{#each generated_config}}
{{#if (eq type "content")}}
{{index}}. {{title}} - {{subtitle}}
   地址：{{body_points.[0]}}
   营业：{{body_points.[1]}}
   必点：{{body_points.[2]}}
{{/if}}
{{/each}}

【候选标签】
{{tags}}

【要求】
1. 标题格式：城市 + 数量 + 类型 + 钩子
   示例："香港8家私藏Cafe｜本地人才知道的宝藏店"

2. 正文结构：
   - 开头：钩子句（1行）
   - 核心信息：📍坐标/☕类型/💰人均/✨特色（4-5行）
   - 店铺清单：逐一介绍，每店3-5行（使用 1️⃣ 2️⃣ 编号）
   - 结尾：互动引导（2行）

3. 标签筛选：
   - 必选1个：城市+类型（如"香港咖啡"）
   - 必选1个：场景词（如"周末打卡"）
   - 备选3个：从候选标签中选择最相关的

输出纯 JSON，不要任何解释。
```

---

### 模板 2：测评类内容 (category=review)

```
请为以下产品测评生成小红书发布参数：

【基础信息】
- 原始标题：{{source_title}}
- 内容类型：产品测评
- 产品名称：{{meta_attributes.product_name}}
- 品牌：{{meta_attributes.brand}}
- 价格：{{meta_attributes.price}}元

【测评结论】
- 评分：{{meta_attributes.rating}}/5
- 优点：{{meta_attributes.pros}}
- 缺点：{{meta_attributes.cons}}
- 适合人群：{{meta_attributes.suitable_for}}
- 回购意愿：{{meta_attributes.repurchase}}

【详细配置】
{{#each generated_config}}
{{#if (eq type "content")}}
{{title}}: {{subtitle}}
{{/if}}
{{/each}}

【候选标签】
{{tags}}

【要求】
1. 标题格式：产品名 + 测评结果 + 适用场景
   示例："YSL小金条｜实测30天，这5个色号最值得买"

2. 正文结构：
   - 开头：总结性评价（2-3行）
   - 优点分析：逐条说明（3-5点）
   - 缺点提示：客观指出（1-2点）
   - 购买建议：适合人群+场景（2-3行）
   - 结尾：互动引导

3. 标签筛选：
   - 必选：产品品类词
   - 必选：测评相关词（如"真实测评"）
   - 备选：从候选标签选择

输出纯 JSON。
```

---

### 模板 3：教程类内容 (category=tutorial)

```
请为以下教程内容生成小红书发布参数：

【基础信息】
- 原始标题：{{source_title}}
- 内容类型：制作教程
- 教程主题：{{meta_attributes.title}}
- 难度：{{meta_attributes.difficulty}}
- 所需时间：{{meta_attributes.time_required}}

【教程要点】
- 所需材料：{{meta_attributes.materials_needed}}
- 步骤数量：{{meta_attributes.steps}}
- 适合人群：{{meta_attributes.suitable_for}}
- 适用场景：{{meta_attributes.occasion}}

【步骤详情】
{{#each generated_config}}
{{#if (eq type "content")}}
步骤{{index}}: {{title}}
{{subtitle}}
{{/if}}
{{/each}}

【候选标签】
{{tags}}

【要求】
1. 标题格式：教程主题 + 难度/时间 + 效果承诺
   示例："5分钟学会番茄美式｜新手也能做出咖啡店水准"

2. 正文结构：
   - 开头：成品效果描述（1-2行）
   - 材料清单：📝所需材料（列表）
   - 步骤说明：1️⃣ 2️⃣ 逐步讲解（每步2-3行）
   - 小技巧：💡关键要点提示（2-3条）
   - 结尾：鼓励尝试 + 互动

3. 标签筛选：
   - 必选：教程主题词
   - 必选：难度或场景词（如"新手教程"）
   - 备选：从候选标签选择

输出纯 JSON。
```

---

### 模板 4：干货科普类 (category=knowledge)

```
请为以下干货内容生成小红书发布参数：

【基础信息】
- 原始标题：{{source_title}}
- 内容类型：知识科普
- 主题：{{meta_attributes.topic}}
- 深度：{{meta_attributes.knowledge_depth}}
- 阅读时长：{{meta_attributes.reading_time}}

【核心要点】
- 关键知识点：{{meta_attributes.key_points}}
- 常见误区：{{meta_attributes.myths_busted}}
- 可执行建议：{{meta_attributes.actionable_tips}}
- 目标受众：{{meta_attributes.target_audience}}

【详细内容】
{{#each generated_config}}
{{#if (eq type "content")}}
要点{{index}}: {{title}}
{{subtitle}}
{{body_points}}
{{/if}}
{{/each}}

【候选标签】
{{tags}}

【要求】
1. 标题格式：主题 + 数量 + 受众/场景
   示例："咖啡豆保存的5个误区｜90%的人都做错了"

2. 正文结构：
   - 开头：引出问题（1-2行）
   - 知识点：📚逐条讲解（3-5点，每点3-4行）
   - 误区辟谣：❌常见错误纠正（2-3条）
   - 实用建议：✅可执行方案（2-3条）
   - 结尾：总结 + 互动

3. 标签筛选：
   - 必选：主题词
   - 必选：干货/科普相关词
   - 备选：从候选标签选择

输出纯 JSON。
```

---

## N8N 节点配置

### 1. 准备数据节点（Code 节点）

```javascript
// 提取并格式化元数据
const item = $input.first().json;

// 根据 category 选择不同的提示词变量
const promptVariables = {
  source_title: item.source_title,
  category: item.category,
  track: item.track,
  tags: item.tags.join(', '),
  keywords: item.keywords.join(', '),

  // 元属性（根据 category 动态提取）
  meta_attributes: item.meta_attributes || {},

  // 店铺列表（探店类）
  shops: item.generated_config
    .filter(c => c.type === 'content')
    .map((shop, idx) => `${idx + 1}. ${shop.title} - ${shop.subtitle}\n   ${shop.body_points.join('\n   ')}`)
    .join('\n\n'),

  // 封面信息
  cover: item.generated_config.find(c => c.type === 'cover') || {},
};

return [{ json: promptVariables }];
```

---

### 2. AI 节点（OpenAI / Claude）

**节点类型**: OpenAI / Anthropic Claude

**配置**：
- Model: `gpt-4o` 或 `claude-3-5-sonnet-20241022`
- Temperature: `0.7`
- Max Tokens: `2000`

**System Message**:
```
你是小红书内容优化专家，擅长将原始内容转换为高互动率的小红书笔记。

输出格式：纯 JSON，格式如下：
{
  "title": "string (10-25字)",
  "content": "string (800-1500字)",
  "tags": ["string"] (3-5个)
}

不要输出任何解释文字，不要使用 Markdown 代码块。
```

**User Message**（根据 category 选择模板）:
```
{{ 选择对应的模板，替换变量 }}
```

---

### 3. 解析 JSON 节点（Code 节点）

```javascript
const aiResponse = $input.first().json;

// 解析 AI 输出
let publishParams;
try {
  // 清理可能的 Markdown 代码块
  const cleanResponse = aiResponse.output
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  publishParams = JSON.parse(cleanResponse);
} catch (error) {
  throw new Error(`Failed to parse AI response: ${error.message}`);
}

// 验证必填字段
if (!publishParams.title || !publishParams.content || !publishParams.tags) {
  throw new Error('AI response missing required fields');
}

// 添加 images（从原始数据）
const originalData = $('准备数据节点').first().json;
publishParams.images = originalData.images
  .filter(img => img.r2_url)
  .sort((a, b) => a.index - b.index)
  .slice(0, 9)
  .map(img => img.r2_url);

return [{ json: { publish_params: publishParams } }];
```

---

## 变量映射表

### 必需变量（所有类型共用）

| 变量名 | 数据路径 | 说明 |
|--------|---------|------|
| `source_title` | `$.source_title` | 原始标题 |
| `category` | `$.category` | 内容类型 |
| `tags` | `$.tags` | 候选标签数组 |
| `generated_config` | `$.generated_config` | 生成配置数组 |

---

### 探店类特有变量 (category=explore)

| 变量名 | 数据路径 | 示例值 |
|--------|---------|--------|
| `city` | `$.meta_attributes.location_summary.city` | "香港" |
| `districts` | `$.meta_attributes.location_summary.districts` | ["铜锣湾", "湾仔"] |
| `total_shops` | `$.meta_attributes.location_summary.total_shops` | 8 |
| `shop_types` | `$.meta_attributes.shop_types` | ["精品咖啡店"] |
| `price_range` | `$.meta_attributes.price_range` | "35-88" |
| `featured_items` | `$.meta_attributes.featured_items` | ["冲绳黑糖咖啡"] |
| `common_features` | `$.meta_attributes.common_features` | ["工业风", "海景"] |

---

### 测评类特有变量 (category=review)

| 变量名 | 数据路径 | 示例值 |
|--------|---------|--------|
| `product_name` | `$.meta_attributes.product_name` | "YSL小金条" |
| `brand` | `$.meta_attributes.brand` | "YSL" |
| `price` | `$.meta_attributes.price` | 350 |
| `rating` | `$.meta_attributes.rating` | 4.5 |
| `pros` | `$.meta_attributes.pros` | ["显色度高", "持久"] |
| `cons` | `$.meta_attributes.cons` | ["易拔干"] |
| `suitable_for` | `$.meta_attributes.suitable_for` | ["通勤妆"] |
| `repurchase` | `$.meta_attributes.repurchase` | true |

---

### 教程类特有变量 (category=tutorial)

| 变量名 | 数据路径 | 示例值 |
|--------|---------|--------|
| `tutorial_title` | `$.meta_attributes.title` | "番茄美式" |
| `difficulty` | `$.meta_attributes.difficulty` | "easy" |
| `time_required` | `$.meta_attributes.time_required` | "5分钟" |
| `materials_needed` | `$.meta_attributes.materials_needed` | ["咖啡", "番茄"] |
| `steps` | `$.meta_attributes.steps` | 3 |
| `suitable_for` | `$.meta_attributes.suitable_for` | ["新手"] |
| `occasion` | `$.meta_attributes.occasion` | ["下午茶"] |

---

### 干货科普类特有变量 (category=knowledge)

| 变量名 | 数据路径 | 示例值 |
|--------|---------|--------|
| `topic` | `$.meta_attributes.topic` | "咖啡豆保存" |
| `knowledge_depth` | `$.meta_attributes.knowledge_depth` | "beginner" |
| `reading_time` | `$.meta_attributes.reading_time` | "3分钟" |
| `key_points` | `$.meta_attributes.key_points` | ["避光", "密封"] |
| `myths_busted` | `$.meta_attributes.myths_busted` | ["冷藏保存"] |
| `actionable_tips` | `$.meta_attributes.actionable_tips` | ["真空罐"] |

---

## 提示词优化技巧

### 1. 增强标题吸引力

在提示词中添加：
```
标题必须满足以下至少2条：
- 包含具体数字
- 制造悬念或对比
- 使用｜分隔主副标题
- 包含情绪词（"私藏"、"宝藏"、"必去"）
```

### 2. 提升正文质量

```
正文要求：
- 每段不超过3行
- 每3-5行使用一个 Emoji
- 使用编号（1️⃣ 2️⃣）或符号（📍 ☕）
- 避免过长段落和复杂句式
```

### 3. 标签筛选策略

```
标签选择原则（按优先级）：
1. 地域+品类组合（如"香港咖啡"）
2. 场景词（如"周末打卡"、"约会圣地"）
3. 特色词（如"海景"、"工业风"）
4. 避免过于宽泛的标签（如"美食"）
```

---

## 完整 N8N Workflow 示例

```
[HTTP Webhook] 接收发布请求
    ↓
[PostgreSQL] 查询任务数据（完整的 meta_attributes）
    ↓
[Code 1] 准备 AI 提示词变量
    ↓
[Switch] 根据 category 选择提示词模板
    ├─ explore → 使用探店模板
    ├─ review → 使用测评模板
    ├─ tutorial → 使用教程模板
    └─ knowledge → 使用干货模板
    ↓
[OpenAI/Claude] 生成发布参数
    ↓
[Code 2] 解析并验证 JSON
    ↓
[Code 3] 添加 images 字段
    ↓
[HTTP Request] 调用小红书发布 API
    ↓
[PostgreSQL] 更新发布状态
```

---

## 测试提示词

使用以下 curl 命令测试 AI 输出：

```bash
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "system",
        "content": "你是小红书内容优化专家..."
      },
      {
        "role": "user",
        "content": "请为以下探店内容生成小红书发布参数：\n\n【基础信息】\n- 原始标题：香港私藏Cafe\n..."
      }
    ],
    "temperature": 0.7,
    "response_format": { "type": "json_object" }
  }'
```

---

## 注意事项

1. **使用 JSON Mode**（OpenAI）或 **结构化输出**（Claude）确保返回有效 JSON
2. **Temperature 设置**：0.7-0.8 平衡创意和稳定性
3. **Token 限制**：确保 max_tokens >= 2000 以生成完整正文
4. **错误处理**：AI 节点后添加 JSON 验证节点
5. **成本优化**：对于简单任务可使用 `gpt-4o-mini` 或 `claude-3-haiku`
