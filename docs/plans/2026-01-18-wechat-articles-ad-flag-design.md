# 微信文章广告标识字段设计

**目标**：在 `wechat_articles` 表中新增布尔字段 `is_ad`，用于标识文章是否为广告内容。

## 方案说明
- **字段**：`is_ad`（boolean）
- **默认值**：`false`
- **约束**：`not null`

## 设计理由
- **KISS**：布尔标识最简单直观，降低复杂度。
- **YAGNI**：当前仅需“是否广告”的标记，不引入类型枚举或元数据。
- **SOLID/DRY**：单一职责清晰、避免多处重复逻辑。

## 变更范围
- **表结构**：`src/server/db/schema/tables/wechat-articles.ts`
  - 新增 `isAd: boolean("is_ad").default(false).notNull()`
- **迁移**：生成并执行 Drizzle 迁移，现有记录默认回填为 `false`。

## 使用与查询
- 普通查询不受影响。
- 需要筛选广告时：`WHERE is_ad = true`。
- 如后续需要区分软/硬广，再追加 `ad_type` 字段，不影响现有数据。

## 验收建议
- 迁移完成后执行：
  - `SELECT COUNT(*) FROM wechat_articles WHERE is_ad = true;`
  - 预期为 0（除非已有手动标注）。
