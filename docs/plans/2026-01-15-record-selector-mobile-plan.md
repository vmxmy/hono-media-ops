# 唱片滑选移动端优化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在移动端为唱片滑选提供精简视图、标题链接与“更多信息”展开能力。

**Architecture:** 通过扩展 `SwipeSelector` 组件的 `record` 变体，识别移动端并渲染精简信息，增加可展开详情与标题链接。数据在父层补充 `linkUrl` 字段。

**Tech Stack:** Next.js + React + Tailwind + A2UI

## 说明
- `npm test` 不存在，计划以 `npm run typecheck` + 手动验收为验证。

---

### Task 1: 扩展 SwipeSelector 支持移动端精简与标题链接

**Files:**
- Modify: `src/components/swipe-selector.tsx`

**Step 1: 写一个失败的类型检查断言（如适用）**
- 如果无现成测试框架，跳过。

**Step 2: 实现移动端识别与精简展示**
- 在组件内部新增 `isMobile` 检测（如 `window.matchMedia`）。
- `variant=record` 且移动端时：隐藏副标题/元信息，标题渲染为链接。
- 加入“更多信息”按钮，展开时显示副标题与元信息。
- 切换项时重置展开状态。

**Step 3: 运行 typecheck**
Run: `npm run typecheck`
Expected: Exit 0.

**Step 4: Commit**
```bash
git add src/components/swipe-selector.tsx
git commit -m "feat: optimize record selector for mobile"
```

---

### Task 2: 传递素材链接到 SwipeSelector

**Files:**
- Modify: `src/app/pipeline/page.tsx`
- Modify: `src/components/a2ui/business/material-swipe-selector.tsx`

**Step 1: 补充 `linkUrl` 字段**
- 在 `material-swipe-selector` 的 items 映射中加入 `linkUrl: material.sourceUrl ?? ""`。
- 在 A2UI 组件里把该字段传给 `SwipeSelector`。

**Step 2: 运行 typecheck**
Run: `npm run typecheck`
Expected: Exit 0.

**Step 3: Commit**
```bash
git add src/app/pipeline/page.tsx src/components/a2ui/business/material-swipe-selector.tsx
git commit -m "feat: add material link to record selector"
```

---

### Task 3: 手动验收

**Step 1: 手动验收移动端**
- 窗口缩窄或真机打开“快速创作”。
- 标题可点击、在新标签打开原文。
- 默认精简视图；点击“更多信息”展开副标题与元信息；切换素材后自动收起。

**Step 2: Commit（如有修复）**
```bash
git add -A
git commit -m "chore: verify record selector mobile"
```
