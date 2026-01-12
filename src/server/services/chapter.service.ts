import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { chapterOutputs, taskBlueprints, taskExecutions } from "@/server/db/schema";

export interface ChapterOutputItem {
  id: string;
  blueprintId: string;
  actNumber: number;
  actName: string | null;
  rawContent: string | null;
  formattedContent: string | null;
  wordCount: number | null;
  status: string | null;
}

function countWords(markdown: string | null): number {
  if (!markdown) return 0;
  return markdown.replace(/\s/g, "").length;
}

export const chapterService = {
  async getByExecutionId(executionId: string): Promise<ChapterOutputItem[]> {
    const [blueprint] = await db
      .select({ id: taskBlueprints.id })
      .from(taskBlueprints)
      .where(eq(taskBlueprints.executionId, executionId))
      .limit(1);

    if (!blueprint) return [];

    return db
      .select()
      .from(chapterOutputs)
      .where(eq(chapterOutputs.blueprintId, blueprint.id))
      .orderBy(asc(chapterOutputs.actNumber));
  },

  async getByTaskId(taskId: string): Promise<ChapterOutputItem[]> {
    const [execution] = await db
      .select({ id: taskExecutions.id })
      .from(taskExecutions)
      .where(
        and(
          eq(taskExecutions.taskId, taskId),
          eq(taskExecutions.status, "completed")
        )
      )
      .orderBy(desc(taskExecutions.startedAt))
      .limit(1);

    if (!execution) return [];

    return this.getByExecutionId(execution.id);
  },

  async updateChapter(
    chapterId: string,
    formattedContent: string
  ): Promise<{ success: boolean }> {
    await db
      .update(chapterOutputs)
      .set({
        formattedContent,
        wordCount: countWords(formattedContent),
        completedAt: new Date(),
      })
      .where(eq(chapterOutputs.id, chapterId));

    return { success: true };
  },
};

export type ChapterService = typeof chapterService;
