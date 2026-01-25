# N8N小红书图片任务节点配置更新指南

## 概述

为了支持任务重试功能,需要在 n8n 的"创建小红书任务"节点中添加新字段映射。

## 问题背景

之前的节点配置没有保存重试所需的关键信息:
- `image_prompt_id` - 图片提示词 ID
- `input_content` - 用户原始输入内容

导致重试时报错: **"此任务缺少必要信息,无法重试。请创建新任务。"**

## 解决方案

### 数据库 Schema 更新

已新增以下字段到 `xhs_image_jobs` 表:

| 字段 | 类型 | 说明 | 必需 |
|------|------|------|------|
| `image_prompt_id` | uuid | 图片提示词 ID (FK) | 重试必需 |
| `input_content` | text | 用户原始输入内容 | 重试必需 |
| `style_prompt` | text | AI 风格提示词 | 可选 |
| `generated_config` | jsonb | AI 生成的图片配置 | 可选 |

### N8N 节点配置更新

#### 当前配置 (有问题)

```json
{
  "columns": {
    "value": {
      "total_images": "={{ JSON.parse($json.output...).length }}",
      "completed_images": 0,
      "user_id": "={{ $json.user_id }}",
      "source_url": "={{ $json.article_link }}",
      "source_title": "={{ $json.title }}",
      "status": "processing",
      "started_at": "={{ $now.toISO() }}"
    },
    "schema": [
      {
        "id": "image_prompt_id",
        "removed": true  // ❌ 错误!
      },
      {
        "id": "input_content",
        "removed": true  // ❌ 错误!
      }
    ]
  }
}
```

#### 更新后配置 (正确)

```json
{
  "columns": {
    "value": {
      "total_images": "={{ JSON.parse($json.output.replace(/```json/g, '').replace(/```/g, '').trim()).length }}",
      "completed_images": 0,
      "user_id": "={{ $json.user_id }}",
      "source_url": "={{ $json.article_link }}",
      "source_title": "={{ $json.title }}",
      "status": "processing",
      "started_at": "={{ $now.toISO() }}",

      "image_prompt_id": "={{ $json.prompt_id }}",
      "input_content": "={{ $json.input_content }}",
      "style_prompt": "={{ $json.style_prompt }}",
      "generated_config": "={{ $json.output }}"
    },
    "schema": [
      {
        "id": "image_prompt_id",
        "type": "string",
        "removed": false
      },
      {
        "id": "input_content",
        "type": "string",
        "removed": false
      },
      {
        "id": "style_prompt",
        "type": "string",
        "removed": false
      },
      {
        "id": "generated_config",
        "type": "object",
        "removed": false
      }
    ]
  }
}
```

### 字段映射说明

| n8n 输入字段 | 数据库字段 | 说明 |
|-------------|-----------|------|
| `$json.prompt_id` | `image_prompt_id` | 前端传入的提示词 ID |
| `$json.input_content` | `input_content` | 用户输入的原始内容 |
| `$json.style_prompt` | `style_prompt` | AI 生成的风格提示词 |
| `$json.output` | `generated_config` | AI 生成的图片配置 JSON |

## 更新步骤

### 1. 备份现有 Workflow

在 n8n 界面中:
1. 打开对应的 workflow
2. 点击右上角 "..." → "Download"
3. 保存为 `xhs-image-workflow-backup-YYYY-MM-DD.json`

### 2. 更新节点配置

1. 在 n8n 中找到 "创建小红书任务" 节点
2. 点击节点进入编辑模式
3. 在 "Columns" 配置中添加新字段映射:
   - `image_prompt_id` → `{{ $json.prompt_id }}`
   - `input_content` → `{{ $json.input_content }}`
   - `style_prompt` → `{{ $json.style_prompt }}`
   - `generated_config` → `{{ $json.output }}`
4. 确保 schema 中这些字段的 `removed` 属性为 `false`
5. 保存节点配置

### 3. 测试验证

#### 3.1 创建新任务

1. 前端触发小红书图片生成
2. 检查数据库记录:
   ```sql
   SELECT
     id,
     image_prompt_id,
     input_content,
     style_prompt,
     generated_config::text
   FROM xhs_image_jobs
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
3. 确认所有字段都已正确写入

#### 3.2 测试重试功能

1. 等待任务失败或手动取消
2. 点击 "重新发起" 按钮
3. 验证:
   - 不再报错 "此任务缺少必要信息"
   - 成功创建新任务
   - 新任务使用相同的 prompt_id 和 input_content

## 数据迁移

### 旧数据处理

对于已存在的任务 (缺少新字段),有两种选择:

#### 选项 1: 标记为不可重试 (推荐)

前端在显示重试按钮前检查必需字段:

```typescript
const canRetry = job.imagePromptId && job.inputContent;
```

#### 选项 2: 数据修复 (可选)

如果 n8n 日志中仍保留原始输入,可以手动修复:

```sql
-- 查看需要修复的任务数量
SELECT COUNT(*)
FROM xhs_image_jobs
WHERE image_prompt_id IS NULL
  AND deleted_at IS NULL;

-- 手动修复单个任务 (如果知道原始数据)
UPDATE xhs_image_jobs
SET
  image_prompt_id = 'uuid-here',
  input_content = 'content-here'
WHERE id = 'job-id-here';
```

## 验证清单

- [ ] n8n 节点配置已更新
- [ ] 新任务正确写入所有必需字段
- [ ] 重试功能正常工作
- [ ] 旧任务的重试按钮被隐藏或禁用
- [ ] 数据库字段类型和约束正确

## 故障排查

### 问题 1: 字段仍然为 NULL

**原因**: n8n 节点配置未生效

**解决**:
1. 检查节点是否保存
2. 检查 workflow 是否已激活
3. 重新部署 workflow

### 问题 2: 类型错误

**原因**: `generated_config` 字段类型不匹配

**解决**:
- 确保 n8n 中该字段类型为 `object`
- 检查 `$json.output` 是否为有效 JSON

### 问题 3: prompt_id 未传递

**原因**: 前端未在 webhook payload 中包含此字段

**解决**:
- 检查 `xhs-image.service.ts` 的 `triggerGeneration` 方法
- 确认 payload 包含 `prompt_id` 字段

## 参考

- 数据库 Schema: `src/server/db/schema/tables/xhs.ts`
- 服务层代码: `src/server/services/xhs-image.service.ts`
- 迁移文件: `drizzle/0012_magical_saracen.sql`
