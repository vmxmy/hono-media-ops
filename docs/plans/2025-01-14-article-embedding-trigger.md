# 文章完成自动触发向量化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在文章执行完成（task execution completed）后自动生成文章 embedding，确保 `article_embeddings` 可用于向量检索。

**Architecture:** 在 `taskService.completeExecution` 里，当状态首次变为 `completed` 且存在 `articleMarkdown` 时，调用 `embeddingService.generateAndStoreEmbedding`。失败不影响主流程（记录日志）。测试覆盖一次性触发与重复调用不重复生成（依赖已有去重逻辑）。

**Tech Stack:** TypeScript, Node test runner, Drizzle ORM, OpenAI SDK

---

### Task 1: 为 completeExecution 触发 embedding 增加测试

**Files:**
- Create: `src/server/services/__tests__/article-embedding-trigger.test.ts`
- Modify: `src/server/services/task.service.ts`

**Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { tasks, taskExecutions, users } from "@/server/db/schema";
import { taskService } from "@/server/services/task.service";
import { embeddingService } from "@/server/services/embedding.service";

const createId = () => crypto.randomUUID();

async function cleanup(ids: { executionId: string; taskId: string; userId: string }) {
  await db.delete(taskExecutions).where(eq(taskExecutions.id, ids.executionId));
  await db.delete(tasks).where(eq(tasks.id, ids.taskId));
  await db.delete(users).where(eq(users.id, ids.userId));
}

test("completeExecution should trigger article embedding on first completion", async () => {
  const ids = { executionId: createId(), taskId: createId(), userId: createId() };
  const original = embeddingService.generateAndStoreEmbedding;
  let calledWith: { executionId: string; taskId: string; content: string } | null = null;

  embeddingService.generateAndStoreEmbedding = async (input) => {
    calledWith = input;
    return { id: createId() };
  };

  try {
    await db.insert(users).values({ id: ids.userId, email: `${ids.userId}@example.com` });
    await db.insert(tasks).values({
      id: ids.taskId,
      topic: "test topic",
      status: "processing",
    });
    await db.insert(taskExecutions).values({
      id: ids.executionId,
      taskId: ids.taskId,
      status: "running",
      articleMarkdown: "# Title\n\ncontent",
    });

    await taskService.completeExecution(ids.executionId, { status: "completed" });

    assert.ok(calledWith);
    assert.equal(calledWith?.executionId, ids.executionId);
    assert.equal(calledWith?.taskId, ids.taskId);
  } finally {
    embeddingService.generateAndStoreEmbedding = original;
    await cleanup(ids);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `DATABASE_URL=... node --test --import tsx src/server/services/__tests__/article-embedding-trigger.test.ts`
Expected: FAIL，`calledWith` 为 `null`。

**Step 3: Write minimal implementation**

在 `taskService.completeExecution` 里，当 `status` 从非 completed → completed 时触发：

```ts
if (wasCompleted === false && input.status === "completed" && execution.articleMarkdown) {
  try {
    await embeddingService.generateAndStoreEmbedding({
      executionId: execution.id,
      taskId: execution.taskId,
      content: prepareContent(execution.articleMarkdown, task.topic, task.keywords),
    });
  } catch (error) {
    console.error("[Task] Failed to generate article embedding", error);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `DATABASE_URL=... node --test --import tsx src/server/services/__tests__/article-embedding-trigger.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/services/__tests__/article-embedding-trigger.test.ts src/server/services/task.service.ts

git commit -m "feat: 文章完成触发 embedding 生成"
```

---

### Task 2: 回归验证

**Files:**
- None

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

