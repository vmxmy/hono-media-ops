import test from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { tasks, taskExecutions, users } from "@/server/db/schema";
import { taskService } from "@/server/services/task.service";
import { embeddingService } from "@/server/services/embedding.service";

const createId = () => crypto.randomUUID();

test.after(async () => {
  const client = (db as unknown as { $client?: { end: (opts?: { timeout: number }) => Promise<void> } }).$client;
  if (client?.end) {
    await client.end({ timeout: 5 });
  }
});

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
    await db.insert(users).values({
      id: ids.userId,
      email: `${ids.userId}@example.com`,
    });
    await db.insert(tasks).values({
      id: ids.taskId,
      topic: "test topic",
      keywords: "alpha,beta",
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
    const called = calledWith as { executionId: string; taskId: string; content: string };
    assert.equal(called.executionId, ids.executionId);
    assert.equal(called.taskId, ids.taskId);
    assert.ok(called.content.includes("标题: test topic"));
    assert.ok(called.content.includes("关键词: alpha,beta"));
  } finally {
    embeddingService.generateAndStoreEmbedding = original;
    await cleanup(ids);
  }
});
