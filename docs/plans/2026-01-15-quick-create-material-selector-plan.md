# 快速创作素材滑选 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan.

**Goal:** 将“快速创作”的参考文章 URL 输入替换为素材滑选，并用唱片式左右滑动进行选择。

**Architecture:** 在快速创作页引入素材列表查询与搜索状态，用自定义 A2UI 组件渲染“唱片式滑选”，并将选中素材映射为现有 pipeline 创建所需的 `sourceUrl`。

**Tech Stack:** Next.js + React + A2UI + Tailwind + tRPC

## 说明
- 当前仓库没有测试脚本（`npm test` 不存在）。本计划以 `npm run typecheck` + `npm run lint` 作为基础验证，并补充手动验收步骤。

---

### Task 1: 扩展 SwipeSelector 支持“唱片”视觉与素材元信息

**Files:**
- Modify: `src/components/swipe-selector.tsx`

**Step 1: 明确新增 props（variant + subtitle/meta）**
- 目标：支持 `variant: "record"`、`subtitle`、`meta`。

**Step 2: 实现记录式 UI**
- 在组件内部根据 `variant` 渲染圆形唱片样式和中心孔。
- 保留现有默认样式，确保封面风格选择不受影响。

**Step 3: 手动验收**
- 启动应用并打开现有封面风格弹层，确认默认样式仍正常。

**Step 4: Commit**
```bash
git add src/components/swipe-selector.tsx
git commit -m "feat: add record variant to swipe selector"
```

---

### Task 2: 新增 A2UI 业务组件：素材唱片滑选

**Files:**
- Create: `src/components/a2ui/business/material-swipe-selector.tsx`
- Modify: `src/components/a2ui/business/index.ts`

**Step 1: 定义节点接口与渲染结构**
- 节点类型 `material-swipe-selector`，输入 items + selectedId + onSelectAction。
- 内部使用 `SwipeSelector` 的 `variant="record"`。

**Step 2: 连接 A2UI Action**
- 选择时调用 `onAction`，传递选中素材 id。

**Step 3: 注册组件**
- 将组件加入 BusinessComponents。

**Step 4: Commit**
```bash
git add src/components/a2ui/business/material-swipe-selector.tsx src/components/a2ui/business/index.ts
git commit -m "feat: add material swipe selector a2ui component"
```

---

### Task 3: 快速创作表单替换为素材滑选

**Files:**
- Modify: `src/app/pipeline/page.tsx`
- Modify: `src/locales/zh-CN.json`
- Modify: `src/locales/en.json`

**Step 1: 增加素材查询与搜索状态**
- 使用 `api.reverseLogs.getAll` 拉取素材列表。
- 新增 `materialSearchQuery` 与 `selectedMaterialId` 状态。

**Step 2: 在输入表单顶部插入素材选择**
- 替换原“参考文章 URL”输入为：搜索输入 + `material-swipe-selector` 节点。
- 增加空态提示（无素材/无搜索结果）。

**Step 3: 更新提交逻辑**
- `analyze` 时根据 `selectedMaterialId` 找到 `sourceUrl`，映射为 `pipeline.create` 的入参。
- 若未选素材或缺少 `sourceUrl`，禁用按钮或阻止提交。

**Step 4: 文案更新**
- 新增素材选择相关文案（中英）。

**Step 5: Commit**
```bash
git add src/app/pipeline/page.tsx src/locales/zh-CN.json src/locales/en.json
git commit -m "feat: replace quick create url input with material selector"
```

---

### Task 4: 验证与手动验收

**Step 1: Typecheck**
Run: `npm run typecheck`
Expected: Exit 0.

**Step 2: Lint**
Run: `npm run lint`
Expected: Exit 0.

**Step 3: 手动验收**
- 打开“快速创作”页面，顶部看到素材搜索 + 唱片式滑选。
- 搜索会更新素材列表，选中素材更新摘要。
- “分析风格”按钮在选择素材与填写话题后可用。

**Step 4: Commit (如有修复)**
```bash
git add -A
git commit -m "chore: verify quick create material selector"
```
