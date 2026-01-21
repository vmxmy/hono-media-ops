# 小红书图片任务取消/重试与状态筛选设计

## 背景
小红书图片管理页目前仅支持发布与删除，缺少取消与重新发起功能，同时没有按任务状态筛选能力。需要补齐任务生命周期操作与可视化筛选，提升可控性与运营效率。

## 目标
- 任务卡片新增“取消”“重新发起”操作。
- 新增 `cancelled` 状态，并在 UI 与统计中可见。
- 顶部增加多选胶囊 Chips 的状态筛选，支持组合过滤。
- 保持现有数据流与轮询逻辑一致性，避免重复逻辑（DRY）。

## 方案比较
### 方案 A（推荐）
**新增 `cancelled` 状态 + cancel/retry 接口 + Chips 多选筛选**。
- **KISS**：在现有 xhsImages 模块内扩展，不引入新系统。
- **YAGNI**：仅增加取消/重试与筛选，不做任务终止 n8n 回调。
- **SOLID**：服务层负责状态变更，路由只编排，UI 只触发。
- **DRY**：重试复用 `triggerGeneration` 流程与入参。

### 方案 B
取消等价于软删除（`deletedAt`），重试新建。
- 语义混淆（取消≠删除），统计与筛选失真。

### 方案 C
取消等价失败（`failed` + 错误标识）。
- 失败/取消难以区分，不利于分析。

**结论**：采用方案 A。

## 设计细节
### 状态与数据模型
- `xhs_job_status` 增加 `cancelled`。
- `xhsJobStatusSchema` 同步扩展。
- 取消时 `status=cancelled`，`errorMessage` 写入“用户取消”。

### 取消与重试接口
- `xhsImages.cancel`：仅允许 `pending/processing/failed`，更新为 `cancelled`。
- `xhsImages.retry`：读取原任务 `metadata.image_prompt_id` 与 `metadata.input_content`，新建任务并复用 `triggerGeneration`。
- 任务创建时确保 `metadata.input_content` 写入（供重试复用）。

### UI/交互
- 任务卡片按钮规则：
  - `pending/processing` → 显示“取消”。
  - `failed/cancelled` → 显示“重新发起”。
  - `completed` → 保持“发布/删除”。
- 所有操作通过确认弹窗触发，成功 toast、失败提示错误信息。

### 状态筛选（多选 Chips）
- 位置：标题区下方。
- Chips：`全部` + `pending/processing/completed/failed/cancelled`。
- 选中集合为空 → 代表全部；非空 → 传入 `getAll` 的 `status` 数组，服务端过滤。

### 测试与验证
- 单元测试：
  - `cancelJob` 变更状态为 `cancelled`。
  - `retryJob` 新建任务并保留原任务不变。
  - `getAll` 支持 status 数组过滤。
- 页面验证：
  - 状态筛选与按钮显隐在 UI 上正确。

## 风险与缓解
- **风险**：重试缺少原始输入内容。
  - **缓解**：创建任务时写入 `metadata.input_content`。
- **风险**：取消后 n8n 仍可能继续执行。
  - **缓解**：仅在 DB 标记状态，后续可扩展 webhook 协议，但当前不做。
