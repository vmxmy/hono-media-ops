# /reverse 列表排序调整 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 仅 `/reverse` 列表在回退到 `getAll` 时使用 `coalesce(updated_at, created_at)` 作为次级排序，保留 `use_count` 为主排序。

**Architecture:** 通过 `sortMode` 参数在 `reverseLogs.hybridSearch` 透传到服务层；向量命中仍按 `score` 排序，回退到 `getAll` 时按 `sortMode` 选择排序表达式。

**Tech Stack:** Next.js, tRPC, Drizzle ORM, PostgreSQL

### Task 1: 扩展查询参数与类型

**Files:**
- Modify: `src/server/services/style-analysis/types.ts`
- Modify: `src/server/api/routers/style-analyses.ts`

**Step 1: Write the failing test**

无现成自动化测试框架（无 `test` 脚本）。本次改动先以手动验证为主，在实现后做可重复的 UI/SQL 验证记录。

**Step 2: Run test to verify it fails**

跳过（无测试框架）。后续会通过手动验证覆盖。

**Step 3: Write minimal implementation**

- 在 `GetAllStyleAnalysesOptions` 中新增可选字段 `sortMode?: "default" | "reverse"`。
- 在 `getAllInputSchema` 中新增可选字段 `sortMode`（`z.enum(["default", "reverse"]).optional()`），并允许 `reverseLogs.hybridSearch` 输入透传该字段。

**Step 4: Run test to verify it passes**

运行类型检查确保类型更新一致。

Run: `npm run typecheck`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/services/style-analysis/types.ts src/server/api/routers/style-analyses.ts
git commit -m "feat: add sortMode option for reverse logs"
```

### Task 2: 回退路径透传 sortMode

**Files:**
- Modify: `src/server/services/style-analysis/search.service.ts`

**Step 1: Write the failing test**

同 Task 1（无自动化测试框架）。

**Step 2: Run test to verify it fails**

跳过。

**Step 3: Write minimal implementation**

- `hybridSearch` 在回退到 `getAll` 时，确保 `sortMode` 原样透传给 `styleAnalysisCrudService.getAll`。

**Step 4: Run test to verify it passes**

Run: `npm run typecheck`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/services/style-analysis/search.service.ts
git commit -m "feat: pass sortMode through hybrid search fallback"
```

### Task 3: 为 /reverse 调整排序表达式

**Files:**
- Modify: `src/server/services/style-analysis/crud.service.ts`
- Modify: `src/app/reverse/page.tsx`

**Step 1: Write the failing test**

同 Task 1（无自动化测试框架）。

**Step 2: Run test to verify it fails**

跳过。

**Step 3: Write minimal implementation**

- 在 `getAll` 中根据 `sortMode` 选择排序表达式：
  - `reverse`: `desc(use_count), desc(coalesce(updated_at, created_at))`
  - default: 维持原排序 `desc(use_count), desc(updated_at)`
- 在 `ReversePage` 的 `reverseLogs.hybridSearch` 调用中传入 `sortMode: "reverse"`。

**Step 4: Run test to verify it passes**

Run: `npm run typecheck`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/services/style-analysis/crud.service.ts src/app/reverse/page.tsx
git commit -m "feat: adjust reverse list fallback sort order"
```

### Task 4: 手动验证记录

**Files:**
- None (manual verification)

**Step 1: Write the failing test**

记录验证步骤（无需代码）。

**Step 2: Run test to verify it fails**

跳过。

**Step 3: Write minimal implementation**

无代码改动。

**Step 4: Run test to verify it passes**

建议验证路径：
- 数据库插入两条 `updated_at` 为空、`created_at` 不同且 `use_count` 相同的记录；
- 打开 `/reverse`，确认排序按 `created_at` 降序；
- 使用搜索词确保向量命中时仍按 `score` 排序。

**Step 5: Commit**

无需提交。
