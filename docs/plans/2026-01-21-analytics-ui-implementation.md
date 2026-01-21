# Analytics UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 统一所有分析/指标页面布局与可访问性细节，提升排版一致性与可用性。

**Architecture:** 在 `src/lib/analytics/layout.ts` 收敛布局常量与轻量构建器，页面只负责数据与内容；A2UI 组件补齐可访问性与键盘交互。

**Tech Stack:** Next.js 15、A2UI、Tailwind、tRPC、TypeScript。

### Task 1: Analytics 布局工具与测试

**Files:**
- Create: `src/lib/analytics/layout.ts`
- Create: `tests/analytics/layout.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import { analyticsHeader, analyticsGrid, ANALYTICS_LAYOUT } from "@/lib/analytics/layout"

const header = analyticsHeader("标题", "描述")
assert.equal(header.type, "column")
assert.equal(ANALYTICS_LAYOUT.cardMinWidth, "280px")

const grid = analyticsGrid([{ type: "card" }])
assert.equal(grid.type, "container")
```

**Step 2: Run test to verify it fails**

Run: `node --import tsx tests/analytics/layout.test.ts`
Expected: FAIL with module not found (`@/lib/analytics/layout`).

**Step 3: Write minimal implementation**

```ts
export const ANALYTICS_LAYOUT = { /* 常量 */ }
export function analyticsHeader(...) { /* 返回 A2UIColumnNode */ }
export function analyticsGrid(...) { /* 返回 A2UIContainerNode */ }
```

**Step 4: Run test to verify it passes**

Run: `node --import tsx tests/analytics/layout.test.ts`
Expected: PASS (exit code 0).

**Step 5: Commit**

```bash
git add tests/analytics/layout.test.ts src/lib/analytics/layout.ts
git commit -m "test: add analytics layout helpers" 
```

### Task 2: Analytics 页面布局统一

**Files:**
- Modify: `src/app/embedding-analytics/page.tsx`
- Modify: `src/app/task-analytics/page.tsx`
- Modify: `src/app/image-prompt-analytics/page.tsx`
- Modify: `src/app/pipeline-analytics/page.tsx`
- Modify: `src/app/xhs-analytics/page.tsx`
- Modify: `src/app/wechat-article-analytics/page.tsx`
- Modify: `src/app/insights/page.tsx`
- Modify: `src/app/materials/page.tsx`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import { analyticsHeader } from "@/lib/analytics/layout"

const header = analyticsHeader("Embedding Analytics")
assert.equal(header.children?.[0]?.type, "text")
```

**Step 2: Run test to verify it fails**

Run: `node --import tsx tests/analytics/layout.test.ts`
Expected: FAIL (missing export or header shape).

**Step 3: Write minimal implementation**

- 引入 `ANALYTICS_LAYOUT`/`analyticsHeader`/`analyticsGrid`。
- 新增页面 h1 标题与描述。
- 用 `analyticsGrid` 替换 `row` 组合卡片。
- 将本地 `CHART_HEIGHT`/`LAYOUT_GAP`/`CARD_MIN_WIDTH` 替换为统一常量。

**Step 4: Run test to verify it passes**

Run: `node --import tsx tests/analytics/layout.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/*analytics*/page.tsx src/app/insights/page.tsx src/app/materials/page.tsx
git commit -m "feat: unify analytics layout" 
```

### Task 3: A2UI 可访问性修复

**Files:**
- Modify: `src/lib/a2ui/schema/standard-catalog.json`
- Modify: `src/components/a2ui/core/interactive/button.tsx`
- Modify: `src/components/a2ui/core/layout.tsx`
- Modify: `src/components/a2ui/business/app-shell.tsx`
- Modify: `src/components/theme-switcher.tsx`
- Modify: `src/components/a2ui/core/content.tsx`
- Modify: `src/lib/a2ui/generated/types.ts`
- Modify: `src/lib/a2ui/generated/catalog.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import type { A2UIButtonNode } from "@/lib/a2ui"

const node: A2UIButtonNode = { type: "button", text: "设置", ariaLabel: "打开设置" }
assert.equal(node.ariaLabel, "打开设置")
```

**Step 2: Run test to verify it fails**

Run: `node --import tsx tests/analytics/layout.test.ts`
Expected: FAIL (type missing ariaLabel).

**Step 3: Write minimal implementation**

- Schema 增加 `ariaLabel`，运行 `npm run a2ui:generate`。
- `A2UIButton` 使用 `ariaLabel`。
- AppShell 导航改为 `<Link>`，增加 skip link 与 aria-label。
- 可点击卡片补键盘事件与 `role`。
- 装饰性 icon 标记 `aria-hidden`。

**Step 4: Run test to verify it passes**

Run: `node --import tsx tests/analytics/layout.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/a2ui src/components/theme-switcher.tsx src/lib/a2ui/schema/standard-catalog.json src/lib/a2ui/generated
npm run a2ui:generate
git commit -m "fix: improve a2ui accessibility" 
```

### Task 4: UI 验证

**Files:**
- Modify: none (verification only)

**Step 1: Run agent-browser checks**

- 打开 `/embedding-analytics`、`/task-analytics` 等页面截图对比。

**Step 2: Commit**

无需提交。
