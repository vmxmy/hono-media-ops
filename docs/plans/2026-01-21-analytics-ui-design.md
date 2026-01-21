# 图表与指标页面 UI/排版优化设计

## 背景
当前多个分析/指标页面（Embedding、Task、Image Prompt、Pipeline、XHS、Wechat Article、Insights、Materials）UI 结构与间距分散在页面内部，布局规则不统一，标题层级不完整，且部分可访问性细节缺失（如 icon-only 按钮缺 aria-label、可点击卡片缺键盘支持）。需要在不破坏现有设计系统的前提下统一排版与交互体验。

## 目标
- 统一分析类页面的布局结构、间距与卡片尺寸感知。
- 补齐标题层级（至少 h1/h2），强化信息层次。
- 建立可复用的布局常量与构建器，减少重复（DRY）。
- 修复关键可访问性问题（导航/按钮/卡片）。

## 方案比较
### 方案 A（推荐）：布局常量 + 轻量布局构建器
**做法**：新增 `src/lib/analytics/layout.ts`，集中定义间距、卡片最小宽度、常用图表高度，并提供 `analyticsHeader`、`analyticsGrid` 等轻量函数。各页面改为使用统一常量与栅格布局；局部卡片内容保持原结构。
- **KISS**：保留既有组件结构，仅统一布局层，复杂度低。
- **YAGNI**：仅抽象共性布局，不引入新渲染系统。
- **SOLID**：布局职责集中在 helper，页面只负责数据与内容。
- **DRY**：移除每页重复的常量与栅格写法。
- **风险**：需要逐页替换布局容器，存在遗漏风险。

### 方案 B：每页手动微调（不推荐）
**做法**：不引入公共层，仅在每个页面手动调整间距、排版与标题。
- **KISS**：改动最少，但重复高。
- **YAGNI**：没有过度设计。
- **SOLID/DRY**：重复代码无法控制，后续维护成本高。
- **风险**：一致性难保证，容易回退。

### 方案 C：新增 A2UI 专用“分析页”组件
**做法**：扩展 A2UI schema，新增 `analytics-page` 类型，统一卡片与图表布局。
- **KISS**：会引入额外 schema/生成流程，复杂度高。
- **YAGNI**：当前需求不需要新增渲染类型。
- **SOLID/DRY**：抽象程度最高，但代价大。
- **风险**：改动范围大，测试与回归成本高。

**推荐结论**：采用方案 A，收益与改动成本平衡最佳。

## 设计细节
### 布局结构
- 页面统一为：`Header(h1 + 描述)` → `Section Grid(s)` → `Full-width cards`。
- 栅格采用 `A2UIContainer` + Tailwind `grid` 类，提供 2/3 列自适应模板。
- 统一间距常量：`sectionGap`、`cardGap`、`contentGap`。

### 组件与职责
- `analyticsHeader(title, subtitle)`：生成 h1/h2 级标题组。
- `analyticsGrid(children, columns)`：统一卡片排列和响应式列数。
- `analyticsCardClass`：为卡片提供统一的 `min-w-0`、`h-full` 与视觉密度。

### 数据流与状态
- 各页面仍通过 tRPC hooks 拉取数据；布局 helper 不引入状态，仅组合节点。
- 空数据统一使用 `A2UIEmptyState`，并在卡片内显示“暂无数据”的一致提示。

### 可访问性与交互
- AppShell 导航与品牌入口改为 `<Link>`，支持 Cmd/Ctrl+Click。
- icon-only 按钮补充 `aria-label`；装饰性图标添加 `aria-hidden`。
- 可点击卡片补充 `role=button` + 键盘触发（Enter/Space）。
- 添加 Skip Link 与 `main` 锚点。

### 测试与验证
- 为 `analytics/layout.ts` 新增最小单元测试，验证 header/grid 输出结构。
- 页面行为验证通过 agent-browser 截图对比（桌面/移动）。

## 风险与缓解
- **风险**：布局抽象覆盖不足导致个别页面仍不一致。
  - **缓解**：逐页清单验证并使用浏览器截图对照。
- **风险**：新增 aria 与键盘处理影响既有交互。
  - **缓解**：仅在可点击卡片和 icon-only 按钮上增量变更。

## 结果预期
- 所有分析/指标页面视觉节奏一致，标题层级明确。
- 交互与可访问性符合 Web Interface Guidelines 基础要求。
- 共享布局规则减少重复并降低后续维护成本。
