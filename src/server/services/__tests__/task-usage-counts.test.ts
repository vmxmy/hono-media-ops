import test from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { tasks, taskExecutions, styleAnalyses, imagePrompts, users } from "@/server/db/schema";
import { taskService } from "@/server/services/task.service";

const createId = () => crypto.randomUUID();

async function cleanup(ids: {
  executionId: string;
  taskId: string;
  styleId: string;
  promptId: string;
  userId: string;
}) {
  await db.delete(taskExecutions).where(eq(taskExecutions.id, ids.executionId));
  await db.delete(tasks).where(eq(tasks.id, ids.taskId));
  await db.delete(imagePrompts).where(eq(imagePrompts.id, ids.promptId));
  await db.delete(styleAnalyses).where(eq(styleAnalyses.id, ids.styleId));
  await db.delete(users).where(eq(users.id, ids.userId));
}

test("completeExecution should increment style and prompt usage on first completion", async () => {
  const ids = {
    executionId: createId(),
    taskId: createId(),
    styleId: createId(),
    promptId: createId(),
    userId: createId(),
  };

  try {
    await db.insert(users).values({
      id: ids.userId,
      email: `${ids.userId}@example.com`,
    });

    await db.insert(styleAnalyses).values({
      id: ids.styleId,
      userId: ids.userId,
    });

    await db.insert(imagePrompts).values({
      id: ids.promptId,
      title: "test prompt",
      prompt: "a prompt",
    });

    await db.insert(tasks).values({
      id: ids.taskId,
      topic: "test topic",
      coverPromptId: ids.promptId,
      refMaterialId: ids.styleId,
      status: "processing",
    });

    await db.insert(taskExecutions).values({
      id: ids.executionId,
      taskId: ids.taskId,
      status: "running",
    });

    await taskService.completeExecution(ids.executionId, { status: "completed" });

    const [styleRow] = await db
      .select({ useCount: styleAnalyses.useCount })
      .from(styleAnalyses)
      .where(eq(styleAnalyses.id, ids.styleId))
      .limit(1);

    const [promptRow] = await db
      .select({ useCount: imagePrompts.useCount })
      .from(imagePrompts)
      .where(eq(imagePrompts.id, ids.promptId))
      .limit(1);

    assert.equal(styleRow?.useCount ?? 0, 1);
    assert.equal(promptRow?.useCount ?? 0, 1);
  } finally {
    await cleanup(ids);
  }
});

test("completeExecution should not double count for repeated completion", async () => {
  const ids = {
    executionId: createId(),
    taskId: createId(),
    styleId: createId(),
    promptId: createId(),
    userId: createId(),
  };

  try {
    await db.insert(users).values({
      id: ids.userId,
      email: `${ids.userId}@example.com`,
    });

    await db.insert(styleAnalyses).values({
      id: ids.styleId,
      userId: ids.userId,
    });

    await db.insert(imagePrompts).values({
      id: ids.promptId,
      title: "test prompt",
      prompt: "a prompt",
    });

    await db.insert(tasks).values({
      id: ids.taskId,
      topic: "test topic",
      coverPromptId: ids.promptId,
      refMaterialId: ids.styleId,
      status: "processing",
    });

    await db.insert(taskExecutions).values({
      id: ids.executionId,
      taskId: ids.taskId,
      status: "running",
    });

    await taskService.completeExecution(ids.executionId, { status: "completed" });
    await taskService.completeExecution(ids.executionId, { status: "completed" });

    const [styleRow] = await db
      .select({ useCount: styleAnalyses.useCount })
      .from(styleAnalyses)
      .where(eq(styleAnalyses.id, ids.styleId))
      .limit(1);

    const [promptRow] = await db
      .select({ useCount: imagePrompts.useCount })
      .from(imagePrompts)
      .where(eq(imagePrompts.id, ids.promptId))
      .limit(1);

    assert.equal(styleRow?.useCount ?? 0, 1);
    assert.equal(promptRow?.useCount ?? 0, 1);
  } finally {
    await cleanup(ids);
  }
});
