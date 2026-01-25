# N8N 创建小红书任务 - SQL INSERT 语句

## 完整 SQL 语句

在 n8n 的 PostgreSQL 节点中，将操作改为 "Execute Query"，使用以下 SQL：

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
    generated_config
)
VALUES (
    {{ $json.user_id }}::uuid,
    {{ $json.article_link }},
    {{ $json.title }},
    {{ JSON.parse($json.output.replace(/```json/g, '').replace(/```/g, '').trim()).length }},
    'processing',
    NOW(),
    {{ $json.prompt_id }}::uuid,
    {{ $json.input_content }},
    {{ $json.style_prompt }},
    {{ $json.output }}::jsonb
)
RETURNING id, created_at;
```

## N8N 节点配置

### 方式 1: Execute Query (推荐)

**节点类型**: PostgreSQL
**操作**: Execute Query

**Query**:
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
    generated_config
)
VALUES (
    $1::uuid,
    $2,
    $3,
    $4,
    'processing',
    NOW(),
    $5::uuid,
    $6,
    $7,
    $8::jsonb
)
RETURNING id, created_at;
```

**Query Parameters** (使用参数化查询更安全):
```json
[
  "={{ $json.user_id }}",
  "={{ $json.article_link }}",
  "={{ $json.title }}",
  "={{ JSON.parse($json.output.replace(/```json/g, '').replace(/```/g, '').trim()).length }}",
  "={{ $json.prompt_id }}",
  "={{ $json.input_content }}",
  "={{ $json.style_prompt }}",
  "={{ $json.output }}"
]
```

### 方式 2: 直接拼接 SQL (需要转义)

**Query**:
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
    generated_config
)
VALUES (
    '{{ $json.user_id }}'::uuid,
    '{{ $json.article_link.replace(/'/g, "''") }}',
    '{{ $json.title.replace(/'/g, "''") }}',
    {{ JSON.parse($json.output.replace(/```json/g, '').replace(/```/g, '').trim()).length }},
    'processing',
    NOW(),
    '{{ $json.prompt_id }}'::uuid,
    $${{ $json.input_content }}$$,
    $${{ $json.style_prompt }}$$,
    '{{ $json.output }}'::jsonb
)
RETURNING id, created_at;
```

**注意**: 使用 `$$..$$` 或单引号转义 `''` 来处理包含单引号的文本。

## 字段映射说明

| 数据库字段 | N8N 输入 | 类型转换 | 说明 |
|-----------|---------|---------|------|
| `user_id` | `$json.user_id` | `::uuid` | 用户 ID |
| `source_url` | `$json.article_link` | text | 文章链接 |
| `source_title` | `$json.title` | text | 文章标题 |
| `total_images` | 解析 `$json.output` 长度 | integer | 图片总数 |
| `status` | 固定值 `'processing'` | enum | 任务状态 |
| `started_at` | `NOW()` | timestamp | 开始时间 |
| `image_prompt_id` | `$json.prompt_id` | `::uuid` | 提示词 ID ⭐ |
| `input_content` | `$json.input_content` | text | 用户输入 ⭐ |
| `style_prompt` | `$json.style_prompt` | text | 风格提示词 ⭐ |
| `generated_config` | `$json.output` | `::jsonb` | 生成配置 ⭐ |

⭐ = 重试功能必需字段

## 自动填充字段

以下字段由数据库自动生成，无需在 INSERT 中指定：

- `id` - UUID (自动生成)
- `ratio` - 默认值 `'3:4'`
- `resolution` - 默认值 `'2K'`
- `completed_images` - 默认值 `0`
- `publish_status` - 默认值 `'not_published'`
- `created_at` - 默认值 `NOW()`
- `updated_at` - 默认值 `NOW()`

## 返回值

使用 `RETURNING` 子句返回新创建的记录信息：

```json
{
  "id": "a1b2c3d4-...",
  "created_at": "2026-01-25T14:30:00.000Z"
}
```

在后续节点中可以使用 `{{ $json.id }}` 引用此任务 ID。

## 完整示例（实际值）

假设输入数据为：
```json
{
  "user_id": "a11bec3d-de18-4ce6-801d-cdbdf41db18a",
  "article_link": "https://mp.weixin.qq.com/s/xxx",
  "title": "番茄美式好喝不？",
  "prompt_id": "f123abc-...",
  "input_content": "[\"番茄美式好喝不？替你们试了！\",...]",
  "style_prompt": "# 视觉风格规范...",
  "output": "[{\"index\":1,\"type\":\"cover\",...}]"
}
```

生成的 SQL 为：
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
    generated_config
)
VALUES (
    'a11bec3d-de18-4ce6-801d-cdbdf41db18a'::uuid,
    'https://mp.weixin.qq.com/s/xxx',
    '番茄美式好喝不？',
    4,
    'processing',
    NOW(),
    'f123abc-...'::uuid,
    $$["番茄美式好喝不？替你们试了！",...]$$,
    $$# 视觉风格规范...$$,
    '[{"index":1,"type":"cover",...}]'::jsonb
)
RETURNING id, created_at;
```

## 验证 SQL

创建任务后，使用以下 SQL 验证数据：

```sql
SELECT
    id,
    status,
    image_prompt_id,
    input_content IS NOT NULL AS has_input,
    style_prompt IS NOT NULL AS has_style,
    generated_config IS NOT NULL AS has_config,
    created_at
FROM xhs_image_jobs
WHERE created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC
LIMIT 1;
```

预期结果：
- `image_prompt_id`: 不为 NULL ✅
- `has_input`: true ✅
- `has_style`: true ✅
- `has_config`: true ✅

## 错误处理

### 常见错误

1. **语法错误**: `syntax error near "..."`
   - 检查单引号是否正确转义
   - 使用 `$$..$$` 包裹包含特殊字符的文本

2. **类型错误**: `invalid input syntax for type uuid`
   - 确保 UUID 字段使用 `::uuid` 转换
   - 检查 `$json.user_id` 和 `$json.prompt_id` 是否为有效 UUID

3. **JSON 解析错误**: `invalid input syntax for type json`
   - 检查 `$json.output` 是否为有效 JSON
   - 确保使用 `::jsonb` 类型转换

4. **外键约束错误**: `violates foreign key constraint`
   - 确认 `image_prompt_id` 在 `image_prompts` 表中存在
   - 如果 prompt_id 不存在，可以设置为 NULL

### 调试技巧

在 n8n 中启用 "Always Output Data" 查看实际执行的 SQL：

```javascript
// 在 Function 节点中预览 SQL
const sql = `
INSERT INTO xhs_image_jobs (...)
VALUES (
    '${$input.item.json.user_id}'::uuid,
    ...
)
`;
return [{ json: { sql } }];
```

## 性能优化

### 批量插入（如需要）

如果需要一次创建多个任务：

```sql
INSERT INTO xhs_image_jobs (
    user_id,
    source_url,
    ...
)
VALUES
    ($1::uuid, $2, ...),
    ($3::uuid, $4, ...),
    ($5::uuid, $6, ...)
RETURNING id, created_at;
```

### 使用事务

在 n8n 中包裹多个操作：

```sql
BEGIN;

INSERT INTO xhs_image_jobs (...) VALUES (...);
-- 其他相关操作

COMMIT;
```
