# 小红书任务卡片发布状态展示设计

## 背景
小红书图片任务卡片当前只展示生成状态与进度，缺少“是否已发布到小红书”的信息，导致运营与排查需要额外查询。

## 目标
- 在任务卡片中直观展示小红书发布状态与关键发布信息。
- 不改动现有发布流程与接口，保持最小改动。

## 范围与非范围
- 范围：任务卡片 UI 展示；字段映射；异常降级。
- 非范围：新增数据库字段、发布流程重构、发布按钮逻辑调整、发布回调机制变更。

## 现状与字段来源
数据表 `xhs_image_jobs` 已包含发布相关字段：
- `publish_status`（枚举：not_published / publishing / published / failed）
- `published_at`
- `xhs_note_id`
- `publish_error_message`

前端任务卡片未读取上述字段，因此无法显示发布信息。

## 字段映射（UI 语义）
- `publish_status` → 发布状态 badge（文案 + 颜色）
- `published_at` → “发布时间”文本（可选）
- `xhs_note_id` → “笔记ID”文本（可选）
- `publish_error_message` → 失败原因（仅 failed 显示）

## 方案比较

### 方案 A（推荐）：标题行新增发布状态 badge + Meta 行新增发布信息
**描述**  
在任务卡片标题行的状态 badge 旁新增“发布状态 badge”，并在 meta 行新增“发布时间/失败原因/笔记ID”。

**优点**  
状态醒目、信息完整、用户识别成本低。

**缺点**  
标题行元素增加，布局略拥挤。

**原则评估与调整建议**  
- KISS：仅新增展示，无交互变更；符合。  
- YAGNI：不新增字段或接口；符合。  
- SOLID：将发布状态映射为独立函数，UI 只消费结果；符合。  
- DRY：集中维护映射表；符合。  
调整建议：保持 badge 文案短，避免标题行过度拥挤。

### 方案 B：仅在 Meta 行展示发布信息
**描述**  
不新增 badge，仅在 meta 行展示“发布状态/发布时间/失败原因/笔记ID”。

**优点**  
布局更简洁，对标题行干扰小。

**缺点**  
发布状态不够醒目，快速扫描不友好。

**原则评估与调整建议**  
- KISS：更简洁；符合。  
- YAGNI：不新增字段或接口；符合。  
- SOLID/DRY：同样可用映射函数；符合。  
调整建议：若采用该方案，需强化文案前缀（如“发布：已发布”）避免被忽略。

**推荐**：方案 A。理由：在运营场景下发布状态优先级高，需更醒目。

## UI 细节（方案 A）
- 发布状态 badge 文案与颜色映射：
  - not_published → “未发布” / muted
  - publishing → “发布中” / processing
  - published → “已发布” / success
  - failed → “发布失败” / destructive
- Meta 行新增一条或多条：
  - `published_at` 存在：展示“发布时间：YYYY/MM/DD”
  - `xhs_note_id` 存在：展示“笔记ID：xxxx”
  - `failed` 且 `publish_error_message` 存在：展示“失败原因：...”并用警示色

## 数据流
`xhsImages.getAll` → `xhsImageService.getAllJobsInfinite` → 返回 `xhs_image_jobs` 全字段 → 前端 `XhsJob` 扩展类型 → UI 通过映射函数生成 badge + meta。

## 异常处理与降级
- `publish_status` 缺失或未知：降级为“未发布”。
- `published_at` 为空：不显示发布时间。
- `publish_error_message` 仅在 `failed` 时显示。

## 测试建议
- 前端渲染测试：四种发布状态文案与颜色映射正确。
- 手动验证：发布状态切换时卡片展示符合预期。
- 回归检查：无发布字段时 UI 不报错。

## 风险与监控
- 风险：标题行元素增加导致拥挤。  
- 缓解：保持文案短、使用小号 badge；必要时在移动端换行。

## 结论
采用方案 A，在不改变后端逻辑的前提下，新增发布状态 badge 与发布信息展示。
