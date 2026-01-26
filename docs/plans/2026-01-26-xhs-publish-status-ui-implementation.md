# 小红书任务卡片发布状态展示 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在小红书任务卡片中展示发布状态与发布信息（发布时间/失败原因/笔记ID），不改动发布流程。

**Architecture:** 新增发布状态映射与元信息提取的纯函数，供页面渲染复用；页面消费现有 `xhs_image_jobs` 字段，渲染 badge 与 meta 文本。

**Tech Stack:** Next.js/React，A2UI，TypeScript，drizzle schema（数据来源），node/tsx 运行轻量测试。

### Task 1: 发布状态映射与元信息提取（TDD）

**Files:**
- Create: `src/lib/xhs-publish-status.ts`
- Create: `tests/xhs-images/publish-status.test.ts`

**Step 1: Write the failing test**

```typescript
import assert from "node:assert/strict"
import {
  getXhsPublishStatusConfig,
  getXhsPublishMetaItems,
} from "../../src/lib/xhs-publish-status"

const published = getXhsPublishStatusConfig("published")
assert.equal(published.labelKey, "xhsImages.publishStatusPublished")
assert.equal(published.color, "success")

const fallback = getXhsPublishStatusConfig(undefined)
assert.equal(fallback.labelKey, "xhsImages.publishStatusNotPublished")
assert.equal(fallback.color, "default")

const items = getXhsPublishMetaItems({
  status: "failed",
  publishErrorMessage: "发布失败",
  publishedAt: new Date("2026-01-26T00:00:00Z"),
  xhsNoteId: "note-123",
  formatDate: (value) => value.toISOString().slice(0, 10),
})
assert.deepEqual(items, [
  { labelKey: "xhsImages.publishError", value: "发布失败", color: "destructive" },
  { labelKey: "xhsImages.publishedAt", value: "2026-01-26", color: "muted" },
  { labelKey: "xhsImages.xhsNoteId", value: "note-123", color: "muted" },
])
```

**Step 2: Run test to verify it fails**

Run: `node --loader tsx tests/xhs-images/publish-status.test.ts`
Expected: FAIL with module not found or missing exports.

**Step 3: Write minimal implementation**

```typescript
export const XHS_PUBLISH_STATUSES = [
  "not_published",
  "publishing",
  "published",
  "failed",
] as const

export type XhsPublishStatus = typeof XHS_PUBLISH_STATUSES[number]

export type XhsPublishBadgeColor = "default" | "processing" | "success" | "destructive"

const PUBLISH_STATUS_CONFIG: Record<XhsPublishStatus, { labelKey: "xhsImages.publishStatusNotPublished" | "xhsImages.publishStatusPublishing" | "xhsImages.publishStatusPublished" | "xhsImages.publishStatusFailed"; color: XhsPublishBadgeColor }> = {
  not_published: { labelKey: "xhsImages.publishStatusNotPublished", color: "default" },
  publishing: { labelKey: "xhsImages.publishStatusPublishing", color: "processing" },
  published: { labelKey: "xhsImages.publishStatusPublished", color: "success" },
  failed: { labelKey: "xhsImages.publishStatusFailed", color: "destructive" },
}

export const getXhsPublishStatusConfig = (status?: XhsPublishStatus | null) => {
  if (!status || !(status in PUBLISH_STATUS_CONFIG)) {
    return PUBLISH_STATUS_CONFIG.not_published
  }
  return PUBLISH_STATUS_CONFIG[status]
}

export type XhsPublishMetaColor = "muted" | "destructive"

export interface XhsPublishMetaItem {
  labelKey: "xhsImages.publishedAt" | "xhsImages.publishError" | "xhsImages.xhsNoteId"
  value: string
  color: XhsPublishMetaColor
}

export const getXhsPublishMetaItems = (input: {
  status?: XhsPublishStatus | null
  publishedAt?: Date | null
  xhsNoteId?: string | null
  publishErrorMessage?: string | null
  formatDate?: (value: Date) => string
}): XhsPublishMetaItem[] => {
  const formatDate = input.formatDate ?? ((value: Date) => value.toLocaleDateString())
  const items: XhsPublishMetaItem[] = []

  if (input.status === "failed" && input.publishErrorMessage) {
    items.push({
      labelKey: "xhsImages.publishError",
      value: input.publishErrorMessage,
      color: "destructive",
    })
  }

  if (input.publishedAt) {
    items.push({
      labelKey: "xhsImages.publishedAt",
      value: formatDate(input.publishedAt),
      color: "muted",
    })
  }

  if (input.xhsNoteId) {
    items.push({
      labelKey: "xhsImages.xhsNoteId",
      value: input.xhsNoteId,
      color: "muted",
    })
  }

  return items
}
```

**Step 4: Run test to verify it passes**

Run: `node --loader tsx tests/xhs-images/publish-status.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/xhs-images/publish-status.test.ts src/lib/xhs-publish-status.ts
git commit -m "feat: add xhs publish status mapping helpers"
```

### Task 2: 任务卡片展示发布状态与发布信息

**Files:**
- Modify: `src/app/xhs-images/page.tsx`
- Modify: `src/locales/zh-CN.json`
- Modify: `src/locales/en.json`
- Modify: `src/contexts/i18n-context.tsx`

**Step 1: Write the failing test**

```typescript
import assert from "node:assert/strict"
import { getXhsPublishStatusConfig } from "../../src/lib/xhs-publish-status"

const config = getXhsPublishStatusConfig("publishing")
assert.equal(config.labelKey, "xhsImages.publishStatusPublishing")
```

**Step 2: Run test to verify it fails**

Run: `node --loader tsx tests/xhs-images/publish-status.test.ts`
Expected: FAIL if locale keys missing or type errors block compilation.

**Step 3: Write minimal implementation**

- 扩展 `XhsJob` 类型增加 `publishStatus/publishedAt/xhsNoteId/publishErrorMessage`。
- 引入 `getXhsPublishStatusConfig` 与 `getXhsPublishMetaItems`，在标题行新增发布状态 badge。
- 在 meta 区域新增发布信息行（根据返回 meta items 渲染）。
- 在 `src/locales/zh-CN.json` 与 `src/locales/en.json` 新增文案键值。
- 在 `src/contexts/i18n-context.tsx` 增加新的 `I18nKey` 类型联合。

**Step 4: Run test to verify it passes**

Run: `node --loader tsx tests/xhs-images/publish-status.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/xhs-images/page.tsx src/locales/zh-CN.json src/locales/en.json src/contexts/i18n-context.tsx
git commit -m "feat: show xhs publish status in job cards"
```

### Task 3: 回归验证

**Files:**
- Test: `tests/xhs-images/publish-status.test.ts`

**Step 1: Run test**

Run: `node --loader tsx tests/xhs-images/publish-status.test.ts`
Expected: PASS

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit (if needed)**

```bash
git status --short
```

