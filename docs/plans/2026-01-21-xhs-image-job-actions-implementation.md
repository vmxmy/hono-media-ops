# 小红书图片任务取消/重试与状态筛选 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为小红书图片任务新增取消/重新发起动作，并在页面顶部提供多选状态筛选。

**Architecture:** 抽取可复用的状态/筛选与重试元数据辅助函数，服务层复用这些函数实现取消与重试；前端使用胶囊式按钮组合实现多选筛选并通过 tRPC 传递过滤条件。

**Tech Stack:** Next.js + tRPC + Drizzle ORM + Zod + A2UI + TypeScript

---

### Task 1: 新增任务状态/筛选辅助函数（@superpowers:test-driven-development）

**Files:**
- Create: `src/lib/xhs-image-job-status.ts`
- Test: `tests/xhs-images/job-status.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import {
  XHS_IMAGE_JOB_STATUSES,
  isXhsImageJobCancellable,
  isXhsImageJobRetryable,
  toggleXhsImageJobStatus,
} from "../../src/lib/xhs-image-job-status"

assert.ok(XHS_IMAGE_JOB_STATUSES.includes("cancelled"))
assert.equal(isXhsImageJobCancellable("pending"), true)
assert.equal(isXhsImageJobCancellable("processing"), true)
assert.equal(isXhsImageJobCancellable("failed"), false)
assert.equal(isXhsImageJobRetryable("failed"), true)
assert.equal(isXhsImageJobRetryable("cancelled"), true)
assert.deepEqual(toggleXhsImageJobStatus([], "pending"), ["pending"])
assert.deepEqual(toggleXhsImageJobStatus(["pending"], "pending"), [])
```

**Step 2: Run test to verify it fails**

Run: `node --loader tsx tests/xhs-images/job-status.test.ts`
Expected: FAIL with module not found or missing export errors

**Step 3: Write minimal implementation**

```ts
export const XHS_IMAGE_JOB_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const

export type XhsImageJobStatus = typeof XHS_IMAGE_JOB_STATUSES[number]

export const isXhsImageJobCancellable = (status: XhsImageJobStatus) =>
  status === "pending" || status === "processing"

export const isXhsImageJobRetryable = (status: XhsImageJobStatus) =>
  status === "failed" || status === "cancelled"

export const toggleXhsImageJobStatus = (
  current: XhsImageJobStatus[],
  target: XhsImageJobStatus
) => (current.includes(target)
  ? current.filter(status => status !== target)
  : [...current, target])
```

**Step 4: Run test to verify it passes**

Run: `node --loader tsx tests/xhs-images/job-status.test.ts`
Expected: PASS (exit code 0)

**Step 5: Commit**

```bash
git add tests/xhs-images/job-status.test.ts src/lib/xhs-image-job-status.ts
git commit -m "feat: add xhs job status helpers"
```

---

### Task 2: 新增重试元数据辅助函数（@superpowers:test-driven-development）

**Files:**
- Create: `src/server/services/xhs-image-metadata.ts`
- Test: `tests/xhs-images/job-retry-input.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import {
  buildXhsImageJobMetadata,
  buildCancelJobUpdate,
  getRetryInputFromMetadata,
} from "../../src/server/services/xhs-image-metadata"

const metadata = buildXhsImageJobMetadata("测试内容", "prompt-1")
assert.equal(metadata.image_prompt_id, "prompt-1")
assert.equal(metadata.input_content, "测试内容")

assert.deepEqual(getRetryInputFromMetadata(metadata), {
  promptId: "prompt-1",
  inputContent: "测试内容",
})

const now = new Date("2026-01-01T00:00:00.000Z")
assert.deepEqual(buildCancelJobUpdate(now), {
  status: "cancelled",
  errorMessage: "用户取消",
  updatedAt: now,
})

assert.equal(getRetryInputFromMetadata({}), null)
```

**Step 2: Run test to verify it fails**

Run: `node --loader tsx tests/xhs-images/job-retry-input.test.ts`
Expected: FAIL with module not found or missing export errors

**Step 3: Write minimal implementation**

```ts
export const buildXhsImageJobMetadata = (inputContent: string, promptId: string) => ({
  image_prompt_id: promptId,
  input_content: inputContent,
})

export const buildCancelJobUpdate = (updatedAt: Date, errorMessage: string = "用户取消") => ({
  status: "cancelled",
  errorMessage,
  updatedAt,
})

export const getRetryInputFromMetadata = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object") return null
  const record = metadata as Record<string, unknown>
  const promptId = record.image_prompt_id
  const inputContent = record.input_content

  if (typeof promptId !== "string" || typeof inputContent !== "string") return null
  if (!promptId || !inputContent) return null

  return { promptId, inputContent }
}
```

**Step 4: Run test to verify it passes**

Run: `node --loader tsx tests/xhs-images/job-retry-input.test.ts`
Expected: PASS (exit code 0)

**Step 5: Commit**

```bash
git add tests/xhs-images/job-retry-input.test.ts src/server/services/xhs-image-metadata.ts
git commit -m "feat: add xhs image job metadata helpers"
```

---

### Task 3: 状态/枚举与服务层联动（@superpowers:test-driven-development）

**Files:**
- Modify: `src/server/db/schema/enums.ts`
- Modify: `src/server/services/xhs-image.service.ts`
- Modify: `src/server/api/routers/xhs-images.ts`
- Test: `tests/xhs-images/job-service-actions.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import { xhsImageService } from "../../src/server/services/xhs-image.service"

assert.equal(typeof xhsImageService.cancelJob, "function")
assert.equal(typeof xhsImageService.retryJob, "function")
```

**Step 2: Run test to verify it fails**

Run: `node --loader tsx tests/xhs-images/job-service-actions.test.ts`
Expected: FAIL with undefined function errors

**Step 3: Implement minimal changes**

- `xhsJobStatusEnum` 增加 `"cancelled"`
- 服务层类型改用 `XhsImageJobStatus`
- `triggerGeneration` 使用 `buildXhsImageJobMetadata`
- 新增 `cancelJob` 与 `retryJob` 方法（使用 `getRetryInputFromMetadata`）
- `xhsJobStatusSchema` 使用 `XHS_IMAGE_JOB_STATUSES`

**Step 4: Run tests**

Run:
- `node --loader tsx tests/xhs-images/job-status.test.ts`
- `node --loader tsx tests/xhs-images/job-retry-input.test.ts`
- `node --loader tsx tests/xhs-images/job-service-actions.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/server/db/schema/enums.ts src/server/services/xhs-image.service.ts src/server/api/routers/xhs-images.ts tests/xhs-images/job-service-actions.test.ts
git commit -m "feat: add cancelled status and xhs job actions"
```

---

### Task 4: tRPC 接口与页面动作（@superpowers:test-driven-development）

**Files:**
- Modify: `src/server/api/routers/xhs-images.ts`
- Modify: `src/app/xhs-images/page.tsx`
- Modify: `src/locales/zh-CN.json`
- Modify: `src/locales/en.json`
- Modify: `src/contexts/i18n-context.tsx`

**Step 1: Write the failing test**

Run:
- `node --loader tsx tests/xhs-images/job-status.test.ts`

Expected: FAIL if UI helper exports are not wired yet

**Step 2: Implement minimal changes**

- router 新增 `cancel` 与 `retry` mutation
- 页面：
  - 顶部新增状态多选 Chips（使用 `toggleXhsImageJobStatus`）
  - 状态为 `pending/processing` 显示 “取消”；`failed/cancelled` 显示 “重新发起”
  - 触发 `cancel`/`retry` mutation 并提示 Toast
- 文案补充国际化 key

**Step 3: Run tests**

Run:
- `node --loader tsx tests/xhs-images/job-status.test.ts`

Expected: PASS

**Step 4: Commit**

```bash
git add src/server/api/routers/xhs-images.ts src/app/xhs-images/page.tsx src/locales/zh-CN.json src/locales/en.json src/contexts/i18n-context.tsx
git commit -m "feat: add xhs job cancel/retry UI and filters"
```

---

### Task 5: 手工验证与收尾

**Files:**
- None

**Step 1: Run quick checks**

Run:
- `node --loader tsx tests/xhs-images/job-status.test.ts`
- `node --loader tsx tests/xhs-images/job-retry-input.test.ts`

Expected: PASS

**Step 2: Manual smoke**

- `npm run dev` 打开 `/xhs-images`
- 验证筛选 Chips 多选生效，取消/重新发起按钮显示与操作正确

**Step 3: Commit (if any touch-ups)**

```bash
git status -sb
```
