# Writing Usage Counts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 写作任务与小红书图片任务在成功完成时，自动累加素材风格与图片提示词的使用计数。

**Architecture:** 在任务完成的服务层入口统一计数，写作任务在 `TaskService.completeExecution`，小红书任务在 `xhsImageService.updateJobStatus`。素材风格计数落在 `style_analyses.use_count`，图片提示词计数落在 `image_prompts.use_count`。小红书提示词 ID 通过 `xhs_image_jobs.metadata.image_prompt_id` 保存。

**Tech Stack:** Next.js、TypeScript、Drizzle ORM、Postgres。

### Task 1: 增加风格分析使用计数字段

**Files:**
- Modify: `src/server/db/schema/tables/style-analyses.ts`
- Modify: `src/server/db/schema/tables/xhs.ts`
- Test: N/A (schema change)

**Step 1: 写出失败测试（如果已有测试框架）**

```ts
// 如果没有测试框架，本步骤记录为 N/A
```

**Step 2: 运行测试确认失败（若适用）**

Run: `node --test` (若未配置测试，跳过)
Expected: FAIL (或提示无测试)

**Step 3: 最小实现**

- 在 `style_analyses` 增加 `use_count` 字段（默认 0，非空）。
- 在 `xhs_image_jobs` 增加 `metadata` 字段（jsonb）。

**Step 4: 生成迁移**

Run: `npm run db:generate`
Expected: 生成对应的迁移 SQL

**Step 5: 提交**

```bash
git add src/server/db/schema/tables/style-analyses.ts src/server/db/schema/tables/xhs.ts drizzle/
git commit -m "feat: add usage count fields"
```

### Task 2: 写作任务完成时累加计数

**Files:**
- Modify: `src/server/services/task.service.ts`
- Modify: `src/server/db/schema/index.ts` (如需新增导出字段)
- Test: `src/server/services/__tests__/task-usage-counts.test.ts` (新增)

**Step 1: 写失败测试**

```ts
import { test } from "node:test";
import assert from "node:assert";

test("completeExecution should increment style and prompt usage on first completion", async () => {
  // 准备：插入任务与执行记录，use_count 初始为 0
  // 断言：completeExecution 后 use_count == 1
});
```

**Step 2: 运行测试确认失败**

Run: `node --test src/server/services/__tests__/task-usage-counts.test.ts`
Expected: FAIL (未实现)

**Step 3: 最小实现**

- 在 `completeExecution` 中读取执行记录状态，只有从非 completed → completed 才计数。
- 读取 `tasks.refMaterialId` 与 `tasks.coverPromptId`。
- 对 `style_analyses.use_count` 与 `image_prompts.use_count` 做原子自增。

**Step 4: 运行测试确认通过**

Run: `node --test src/server/services/__tests__/task-usage-counts.test.ts`
Expected: PASS

**Step 5: 提交**

```bash
git add src/server/services/task.service.ts src/server/services/__tests__/task-usage-counts.test.ts
git commit -m "feat: count usage on writing completion"
```

### Task 3: 小红书任务完成时累加提示词计数

**Files:**
- Modify: `src/server/services/xhs-image.service.ts`
- Test: `src/server/services/__tests__/xhs-usage-counts.test.ts` (新增)

**Step 1: 写失败测试**

```ts
import { test } from "node:test";
import assert from "node:assert";

test("xhs job completion should increment prompt usage once", async () => {
  // 准备：xhs job metadata.image_prompt_id 指向 prompt
  // 断言：状态第一次完成时 use_count +1，重复完成不重复计数
});
```

**Step 2: 运行测试确认失败**

Run: `node --test src/server/services/__tests__/xhs-usage-counts.test.ts`
Expected: FAIL

**Step 3: 最小实现**

- 在 `triggerGeneration` 创建 job 时写入 `metadata.image_prompt_id`。
- 在 `updateJobStatus` 中读取当前状态与 metadata，仅在状态首次变为 completed 时计数。
- 对 `image_prompts.use_count` 做原子自增。

**Step 4: 运行测试确认通过**

Run: `node --test src/server/services/__tests__/xhs-usage-counts.test.ts`
Expected: PASS

**Step 5: 提交**

```bash
git add src/server/services/xhs-image.service.ts src/server/services/__tests__/xhs-usage-counts.test.ts
git commit -m "feat: count usage on xhs completion"
```

### Task 4: 验证与收尾

**Files:**
- Test: N/A

**Step 1: 运行类型检查**

Run: `npm run typecheck`
Expected: PASS

**Step 2: （可选）运行 lint**

Run: `npm run lint`
Expected: PASS（若触发 ESLint 迁移，跳过并记录）

**Step 3: 提交计划**

```bash
git add docs/plans/2026-01-13-writing-usage-counts.md
git commit -m "docs: add writing usage counts plan"
```
