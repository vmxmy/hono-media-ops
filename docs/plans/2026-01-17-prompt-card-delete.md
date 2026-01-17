# 提示词卡片删除按钮 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在提示词卡片列表中添加删除按钮，复用现有删除确认与接口。

**Architecture:** 抽取卡片操作按钮构建为纯函数，主页面复用该函数生成操作区，并用最小单元测试验证“删除按钮存在且绑定删除 action”。

**Tech Stack:** Next.js (App Router), React, A2UI nodes, Node.js built-in test runner

---

### Task 1: 提取卡片操作按钮构建函数

**Files:**
- Create: `src/app/prompts/prompt-card-actions.ts`
- Modify: `src/app/prompts/page.tsx`

**Step 1: Write the failing test**

Create: `src/app/prompts/__tests__/prompt-card-actions.test.ts`
```ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { buildPromptCardActionButtons } from "../prompt-card-actions"

const t = (key: string) => key

test("includes delete action button", () => {
  const nodes = buildPromptCardActionButtons(t, "prompt-1")
  const deleteButton = nodes.find(
    (node) => node.type === "button" && node.text === "common.delete"
  )
  assert.ok(deleteButton, "delete button should exist")
  assert.equal(deleteButton?.onClick?.action, "delete")
  assert.equal(deleteButton?.onClick?.stopPropagation, true)
})
```

**Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/app/prompts/__tests__/prompt-card-actions.test.ts`
Expected: FAIL with module not found or export missing

**Step 3: Write minimal implementation**

Create: `src/app/prompts/prompt-card-actions.ts`
```ts
import type { A2UINode } from "@/lib/a2ui"

export function buildPromptCardActionButtons(
  t: (key: string) => string,
  promptId: string
): A2UINode[] {
  return [
    {
      type: "button",
      text: t("common.edit"),
      variant: "ghost",
      size: "sm",
      onClick: { action: "edit", args: [promptId], stopPropagation: true },
    },
    {
      type: "button",
      text: t("common.delete"),
      variant: "destructive",
      size: "sm",
      onClick: { action: "delete", args: [promptId], stopPropagation: true },
    },
  ]
}
```

Update: `src/app/prompts/page.tsx` (replace card actions row)
```ts
import { buildPromptCardActionButtons } from "./prompt-card-actions"

// ...inside buildPromptsList card actions row...
{
  type: "row",
  gap: "0.25rem",
  children: buildPromptCardActionButtons(t, prompt.id),
},
```

**Step 4: Run test to verify it passes**

Run: `node --test --import tsx src/app/prompts/__tests__/prompt-card-actions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/prompts/prompt-card-actions.ts src/app/prompts/page.tsx src/app/prompts/__tests__/prompt-card-actions.test.ts
git commit -m "feat: add delete button to prompt cards"
```

---

### Task 2: 手动验证 UI 行为

**Files:**
- Modify: `src/app/prompts/page.tsx`

**Step 1: Run dev server**

Run: `npm run dev`
Expected: server starts

**Step 2: Manual verification**

- 打开提示词列表页
- 确认卡片右下角存在“删除”按钮
- 点击删除按钮，确认弹窗出现
- 确认删除后列表刷新，卡片消失

**Step 3: Commit (if manual adjustments needed)**

```bash
git add src/app/prompts/page.tsx
git commit -m "chore: adjust prompt card delete UI"
```
