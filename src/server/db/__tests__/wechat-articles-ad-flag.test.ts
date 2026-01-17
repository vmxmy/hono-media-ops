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
