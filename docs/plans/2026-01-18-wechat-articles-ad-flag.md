# 微信文章广告标识字段 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 `wechat_articles` 表中新增布尔字段 `is_ad`（默认 `false`）并完成迁移。

**Architecture:** 先用 `information_schema.columns` 写最小数据库测试验证列存在性，生成并执行 Drizzle 迁移后再次运行测试确保通过。

**Tech Stack:** Drizzle ORM, PostgreSQL, Node.js `node:test`, tsx

---

### Task 1: 写入失败测试（列不存在时应失败）

**Files:**
- Create: `src/server/db/__tests__/wechat-articles-ad-flag.test.ts`

**Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

interface ColumnRow {
  column_default: string | null;
  is_nullable: string;
}

test("wechat_articles has is_ad column with default false", async () => {
  const results = await db.execute(sql`
    select column_default, is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wechat_articles'
      and column_name = 'is_ad'
  `);

  const rows = results as unknown as ColumnRow[];
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.is_nullable, "NO");
  assert.ok(rows[0]?.column_default?.includes("false"));
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
set -a; source .env.local; set +a;
node --test --import tsx src/server/db/__tests__/wechat-articles-ad-flag.test.ts
```
Expected: FAIL (列不存在，rows.length 为 0)

---

### Task 2: 添加字段并生成迁移

**Files:**
- Modify: `src/server/db/schema/tables/wechat-articles.ts`
- Create: `drizzle/*_add_is_ad_to_wechat_articles.sql`

**Step 1: Implement minimal schema change**

```ts
import { boolean } from "drizzle-orm/pg-core";

// ...inside wechatArticles table definition
isAd: boolean("is_ad").default(false).notNull(),
```

**Step 2: Generate migration**

Run:
```bash
set -a; source .env.local; set +a;
npm run db:generate
```
Expected: 生成新的迁移文件（位于 `drizzle/` 目录）

**Step 3: Apply migration**

Run:
```bash
set -a; source .env.local; set +a;
npm run db:migrate
```
Expected: 迁移执行成功

**Step 4: Run test to verify it passes**

Run:
```bash
set -a; source .env.local; set +a;
node --test --import tsx src/server/db/__tests__/wechat-articles-ad-flag.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/db/schema/tables/wechat-articles.ts \
  src/server/db/__tests__/wechat-articles-ad-flag.test.ts \
  drizzle/*_add_is_ad_to_wechat_articles.sql

git commit -m "feat: add is_ad flag to wechat articles"
```
