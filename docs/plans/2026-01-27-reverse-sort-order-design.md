# /reverse 列表排序调整设计

## 目标与范围
- 目标：在 `/reverse` 列表中，保留 `use_count` 主排序，同时在 `updated_at` 为空时按 `created_at` 进行稳定排序。
- 范围：仅 `/reverse` 列表生效，不影响其他使用 `styleAnalysisCrudService.getAll` 的页面。
- 成功标准：`updated_at` 为空的记录能按 `created_at` 有序展示，且不改变向量搜索命中时的评分排序。

## 方案与取舍
- 方案 A（推荐）：在 `reverseLogs.hybridSearch` 增加 `sortMode` 参数，仅 `/reverse` 传入 `reverse` 模式。
  - 优点：影响范围可控，符合 SOLID；避免复制查询逻辑，DRY 更好。
  - 缺点：需要在路由与服务层透传参数。
- 方案 B：新增专用 `getAllForReverse`。
  - 优点：实现直观，隔离性强。
  - 缺点：逻辑重复，DRY 违背，维护成本更高。

## 数据流与排序规则
- 数据流：`ReversePage` → `reverseLogs.hybridSearch` → `styleAnalysisSearchService.hybridSearch` → `styleAnalysisCrudService.getAll`。
- 搜索词存在且向量检索命中时：维持现有 `score` 排序，不做额外排序干预。
- 回退到 `getAll` 时：按 `use_count` 降序；次序使用 `coalesce(updated_at, created_at)` 降序。

## 具体变更点
- `src/app/reverse/page.tsx`：调用 `reverseLogs.hybridSearch` 时传入 `sortMode: "reverse"`。
- `src/server/api/routers/style-analyses.ts`：扩展输入 schema，透传 `sortMode`。
- `src/server/services/style-analysis/search.service.ts`：在回退到 `getAll` 时携带 `sortMode`。
- `src/server/services/style-analysis/crud.service.ts`：根据 `sortMode` 选择排序表达式。

## 风险与回滚
- 风险：新增参数若未透传，可能导致排序未生效。
- 回滚：移除 `sortMode` 参数与分支逻辑，恢复原排序规则。

## 测试要点
- `updated_at` 为空时，`/reverse` 列表按 `created_at` 降序排列。
- `use_count` 仍为主排序，`use_count` 不同的记录顺序不受影响。
- 有搜索词且命中向量搜索时，排序仍按 `score` 降序。

## 工程原则对照
- KISS：只在回退排序中增加 `coalesce`，保持逻辑简洁。
- YAGNI：不扩展到其他页面，仅满足 `/reverse` 需求。
- SOLID：排序策略由 `sortMode` 控制，职责边界清晰。
- DRY：复用 `getAll`，避免新建重复查询。
