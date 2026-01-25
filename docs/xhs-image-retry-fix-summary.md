# 小红书图片任务重试功能修复 - 实施总结

## 变更概述

将重试所需的关键信息从 JSONB `metadata` 字段提升为独立的表字段,解决重试时报错"此任务缺少必要信息"的问题。

## 数据库变更

### 新增字段

在 `xhs_image_jobs` 表中新增以下字段:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `image_prompt_id` | uuid | FK → image_prompts.id | 图片提示词 ID (重试必需) |
| `input_content` | text | nullable | 用户原始输入内容 (重试必需) |
| `style_prompt` | text | nullable | AI 风格提示词 (可选) |
| `generated_config` | jsonb | nullable | AI 生成的图片配置 (可选) |

### 新增索引

- `idx_xhs_image_jobs_image_prompt_id` - 提升关联查询性能

### 迁移文件

- `drizzle/0012_magical_saracen.sql` - 自动生成的迁移脚本
- 已使用 `npm run db:push` 应用到数据库

## 代码变更

### 1. Schema 定义 (`src/server/db/schema/tables/xhs.ts`)

**变更**:
- 导入 `imagePrompts` 表以支持外键引用
- 新增 4 个字段定义
- 新增 `GeneratedImageConfig` 类型接口
- 新增 `imagePromptIdIdx` 索引

**影响**:
- TypeScript 类型推断自动更新
- 所有依赖此 schema 的代码可直接使用新字段

### 2. 服务层 (`src/server/services/xhs-image.service.ts`)

#### 变更 1: 重试逻辑

**之前** (使用 metadata):
```typescript
const [job] = await db.select({
  userId: xhsImageJobs.userId,
  metadata: xhsImageJobs.metadata,
}).from(xhsImageJobs)...

const retryInput = getRetryInputFromMetadata(job.metadata);
if (!retryInput) { ... }
```

**现在** (使用独立字段):
```typescript
const [job] = await db.select({
  userId: xhsImageJobs.userId,
  imagePromptId: xhsImageJobs.imagePromptId,
  inputContent: xhsImageJobs.inputContent,
}).from(xhsImageJobs)...

if (!job.imagePromptId || !job.inputContent) { ... }
```

**优势**:
- 类型安全 (编译时检查)
- 代码更简洁
- 查询性能更好

#### 变更 2: 使用统计

**之前** (从 metadata 提取):
```typescript
const metadata = current?.metadata;
const promptId = metadata && typeof metadata === "object"
  ? (metadata as Record<string, unknown>).image_prompt_id
  : undefined;

if (typeof promptId === "string" && promptId) { ... }
```

**现在** (直接使用字段):
```typescript
const promptId = current?.imagePromptId;

if (promptId) { ... }
```

#### 变更 3: 导入清理

移除不再需要的导入:
- `buildXhsImageJobMetadata` (不再使用)
- `getRetryInputFromMetadata` (不再使用)

保留:
- `buildCancelJobUpdate` (取消任务仍需使用)

## N8N 配置更新 (待执行)

### 必需变更

在 "创建小红书任务" 节点中添加字段映射:

```json
{
  "image_prompt_id": "={{ $json.prompt_id }}",
  "input_content": "={{ $json.input_content }}",
  "style_prompt": "={{ $json.style_prompt }}",
  "generated_config": "={{ $json.output }}"
}
```

### 详细说明

参见: `docs/n8n-xhs-image-job-creation-update.md`

## 向后兼容性

### 旧数据处理

**现状**:
- 旧任务的新字段值为 `NULL`
- 重试时会触发错误提示 (符合预期)

**前端处理**:
```typescript
// 示例: 在显示重试按钮前检查
const canRetry = job.imagePromptId && job.inputContent;
```

### metadata 字段

**保留原因**:
- 用于存储其他扩展数据
- 向后兼容
- 未来可能的新需求

## 验证清单

- [x] 数据库 Schema 更新完成
- [x] 迁移脚本已生成并应用
- [x] 服务层代码已更新
- [x] TypeScript 类型检查通过
- [x] 文档已创建
- [ ] N8N 节点配置更新 (需要手动操作)
- [ ] 创建测试任务验证
- [ ] 测试重试功能
- [ ] 提交代码变更

## 提交建议

```bash
git add .
git commit -m "feat: extend xhs_image_jobs with dedicated retry fields

- Add image_prompt_id, input_content, style_prompt, generated_config fields
- Refactor retryJob to use direct field access instead of metadata
- Simplify usage count tracking with imagePromptId field
- Generate migration 0012_magical_saracen.sql
- Add N8N configuration update guide

BREAKING CHANGE: N8N workflow needs to be updated to populate new fields.
See docs/n8n-xhs-image-job-creation-update.md for details.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## 后续任务

1. **立即** - 更新 N8N 节点配置
2. **测试** - 创建新任务并验证字段填充
3. **测试** - 验证重试功能正常工作
4. **可选** - 为新功能添加单元测试
5. **可选** - 清理 `xhs-image-metadata.ts` 中不再使用的导出

## 性能影响

### 查询性能

**提升**:
- 不再需要 JSONB 字段解析
- 新增索引提升关联查询速度

**影响范围**:
- `retryJob`: 查询更快
- `updateJobStatus`: 查询更快
- 关联查询 `image_prompts`: 索引加速

### 存储空间

**增加**:
- 每条记录约增加 ~100-500 bytes (取决于 `input_content` 长度)
- 索引额外占用约 16 bytes/record

**评估**: 可接受 (数据结构化带来的价值远大于存储成本)

## 回滚计划

如需回滚:

1. **代码回滚**:
   ```bash
   git revert HEAD
   ```

2. **数据库回滚** (慎用):
   ```sql
   DROP INDEX idx_xhs_image_jobs_image_prompt_id;
   ALTER TABLE xhs_image_jobs
     DROP COLUMN image_prompt_id,
     DROP COLUMN input_content,
     DROP COLUMN style_prompt,
     DROP COLUMN generated_config;
   ```

3. **恢复 N8N 配置**: 使用备份文件

**注意**: 回滚会导致新创建的任务无法重试!

## 参考文档

- [N8N 配置更新指南](./n8n-xhs-image-job-creation-update.md)
- Schema: `src/server/db/schema/tables/xhs.ts`
- Service: `src/server/services/xhs-image.service.ts`
- Migration: `drizzle/0012_magical_saracen.sql`
