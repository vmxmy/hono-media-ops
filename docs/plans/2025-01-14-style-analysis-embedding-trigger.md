# 素材创建/更新自动触发向量化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在素材（style_analyses）创建/更新成功后自动触发 embedding 生成，减少人工补齐。

**Architecture:** 在 `styleAnalysisService` 中包装 create/upsert，调用 CRUD 完成写库后触发搜索服务 `generateAndStoreEmbedding`（失败不影响主流程）。通过单元测试断言触发逻辑是否在 SUCCESS 状态下执行。

**Tech Stack:** TypeScript, Node test runner, Drizzle ORM, tRPC services

---

### Task 1: 为 create 触发 embedding 增加测试

**Files:**
- Create: `src/server/services/__tests__/style-analysis-embedding-trigger.test.ts`
- Modify: `src/server/services/style-analysis/index.ts`

**Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { styleAnalyses, users } from "@/server/db/schema";
import { styleAnalysisService } from "@/server/services/style-analysis";
import { styleAnalysisSearchService } from "@/server/services/style-analysis/search.service";

const createId = () => crypto.randomUUID();

async function cleanup(ids: { styleId: string; userId: string }) {
  await db.delete(styleAnalyses).where(eq(styleAnalyses.id, ids.styleId));
  await db.delete(users).where(eq(users.id, ids.userId));
}

test("styleAnalysisService.create should trigger embedding generation on SUCCESS", async () => {
  const ids = { styleId: createId(), userId: createId() };
  const original = styleAnalysisSearchService.generateAndStoreEmbedding;
  let calledWith: string | null = null;

  styleAnalysisSearchService.generateAndStoreEmbedding = async (id: string) => {
    calledWith = id;
    return { success: true };
  };

  try {
    await db.insert(users).values({ id: ids.userId, email: `${ids.userId}@example.com` });

    await styleAnalysisService.create({
      id: ids.styleId,
      userId: ids.userId,
      sourceTitle: "test",
      status: "SUCCESS",
    });

    assert.equal(calledWith, ids.styleId);
  } finally {
    styleAnalysisSearchService.generateAndStoreEmbedding = original;
    await cleanup(ids);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/server/services/__tests__/style-analysis-embedding-trigger.test.ts`
Expected: FAIL，`calledWith` 为 `null`。

**Step 3: Write minimal implementation**

```ts
const triggerEmbeddingIfEligible = async (id: string, status?: string) => {
  if (status !== "SUCCESS") return;
  try {
    await styleAnalysisSearchService.generateAndStoreEmbedding(id);
  } catch (error) {
    console.error("[StyleAnalysis] Failed to generate embedding", error);
  }
};
```

在 `styleAnalysisService.create` 里调用 `triggerEmbeddingIfEligible`。

**Step 4: Run test to verify it passes**

Run: `node --test --import tsx src/server/services/__tests__/style-analysis-embedding-trigger.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/services/__tests__/style-analysis-embedding-trigger.test.ts src/server/services/style-analysis/index.ts

git commit -m "feat: 素材创建触发 embedding 生成"
```

---

### Task 2: 为 upsert 触发 embedding 增加测试

**Files:**
- Modify: `src/server/services/__tests__/style-analysis-embedding-trigger.test.ts`
- Modify: `src/server/services/style-analysis/index.ts`

**Step 1: Write the failing test**

```ts
test("styleAnalysisService.upsert should trigger embedding generation on SUCCESS", async () => {
  const ids = { styleId: createId(), userId: createId() };
  const sourceUrl = `https://example.com/${ids.styleId}`;
  const original = styleAnalysisSearchService.generateAndStoreEmbedding;
  let calledWith: string | null = null;

  styleAnalysisSearchService.generateAndStoreEmbedding = async (id: string) => {
    calledWith = id;
    return { success: true };
  };

  try {
    await db.insert(users).values({ id: ids.userId, email: `${ids.userId}@example.com` });

    await styleAnalysisService.upsert({
      id: ids.styleId,
      userId: ids.userId,
      sourceUrl,
      sourceTitle: "test",
      status: "SUCCESS",
    });

    assert.equal(calledWith, ids.styleId);
  } finally {
    styleAnalysisSearchService.generateAndStoreEmbedding = original;
    await cleanup(ids);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/server/services/__tests__/style-analysis-embedding-trigger.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```ts
const result = await styleAnalysisCrudService.upsert(input);
await triggerEmbeddingIfEligible(result.id, result.analysis.status);
return result;
```

**Step 4: Run test to verify it passes**

Run: `node --test --import tsx src/server/services/__tests__/style-analysis-embedding-trigger.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/services/__tests__/style-analysis-embedding-trigger.test.ts src/server/services/style-analysis/index.ts

git commit -m "feat: 素材更新触发 embedding 生成"
```

---

### Task 3: 最小回归验证

**Files:**
- None

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 2: Commit (if needed)**

```bash
git status -sb
```

