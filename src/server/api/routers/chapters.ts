import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const executionIdSchema = z.object({ executionId: z.string() });
const taskIdSchema = z.object({ id: z.string() });

const updateChapterSchema = z.object({
  chapterId: z.string(),
  formattedContent: z.string(),
});

export const chaptersRouter = createTRPCRouter({
  getByExecutionId: protectedProcedure
    .input(executionIdSchema)
    .query(({ ctx, input }) =>
      ctx.services.chapter.getByExecutionId(input.executionId)
    ),

  getByTaskId: publicProcedure
    .input(taskIdSchema)
    .query(({ ctx, input }) =>
      ctx.services.chapter.getByTaskId(input.id)
    ),

  update: protectedProcedure
    .input(updateChapterSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.chapter.updateChapter(input.chapterId, input.formattedContent)
    ),
});
