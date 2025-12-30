import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// ==================== Input Schemas ====================

const taskStatusEnum = z.enum(["pending", "processing", "completed", "failed", "cancelled"]);

const getAllInputSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
  status: taskStatusEnum.or(z.array(taskStatusEnum)).optional(),
  search: z.string().optional(),
  userId: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  hasResult: z.boolean().optional(),
  sortBy: z.enum(["createdAt", "status", "topic"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createInputSchema = z.object({
  topic: z.string().min(1),
  keywords: z.string().optional(),
  totalWordCount: z.number().min(100).max(50000).default(4000),
  // Cover prompt (link to image_prompts)
  coverPromptId: z.string().optional(),
  // Reference material (link to reverse_engineering_logs)
  refMaterialId: z.string().optional(),
  // Whether to use search engine
  useSearch: z.boolean().default(true),
});

const updateInputSchema = z.object({
  id: z.string(),
  topic: z.string().min(1).optional(),
  keywords: z.string().optional(),
  // Cover prompt (link to image_prompts)
  coverPromptId: z.string().optional(),
});

const updateStatusSchema = z.object({
  id: z.string(),
  status: taskStatusEnum,
});

const idSchema = z.object({ id: z.string() });

const idsSchema = z.object({
  ids: z.array(z.string()).min(1),
});

const batchUpdateStatusSchema = z.object({
  ids: z.array(z.string()).min(1),
  status: taskStatusEnum,
});

const exportSchema = z.object({
  ids: z.array(z.string()).optional(),
  status: taskStatusEnum.optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

const createExecutionSchema = z.object({
  taskId: z.string(),
  n8nExecutionId: z.string().optional(),
});

const completeExecutionSchema = z.object({
  executionId: z.string(),
  status: z.enum(["completed", "failed"]),
  errorMessage: z.string().optional(),
  coverUrl: z.string().optional(),
  coverR2Key: z.string().optional(),
  wechatMediaId: z.string().optional(),
  wechatDraftId: z.string().optional(),
  articleMarkdown: z.string().optional(),
  articleHtml: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ==================== Router ====================

export const tasksRouter = createTRPCRouter({
  // ==================== Query Methods ====================

  getAll: protectedProcedure
    .input(getAllInputSchema)
    .query(({ ctx, input }) => ctx.services.task.getAll({ ...input, userId: ctx.user.id })),

  getById: protectedProcedure
    .input(idSchema)
    .query(({ ctx, input }) => ctx.services.task.getById(input.id)),

  getWithExecutions: protectedProcedure
    .input(idSchema)
    .query(({ ctx, input }) => ctx.services.task.getWithExecutions(input.id)),

  getByIds: protectedProcedure
    .input(idsSchema)
    .query(({ ctx, input }) => ctx.services.task.getByIds(input.ids)),

  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(({ ctx, input }) => ctx.services.task.getRecent(input.limit)),

  getByStatus: protectedProcedure
    .input(z.object({ status: taskStatusEnum, limit: z.number().optional() }))
    .query(({ ctx, input }) => ctx.services.task.getByStatus(input.status, input.limit)),

  // ==================== Statistics ====================

  getStatistics: protectedProcedure
    .query(({ ctx }) => ctx.services.task.getStatistics()),

  // ==================== Mutation Methods ====================

  create: protectedProcedure
    .input(createInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.task.createAndTrigger(
        { ...input, userId: ctx.user.id },
        ""
      );
      return { id: result.id, task: result.task };
    }),

  update: protectedProcedure
    .input(updateInputSchema)
    .mutation(({ ctx, input }) => ctx.services.task.update(input)),

  updateStatus: protectedProcedure
    .input(updateStatusSchema)
    .mutation(({ ctx, input }) => ctx.services.task.updateStatus(input)),

  // Public endpoint for n8n webhook callbacks
  updateStatusCallback: publicProcedure
    .input(updateStatusSchema)
    .mutation(({ ctx, input }) => ctx.services.task.updateStatus(input)),

  delete: protectedProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => ctx.services.task.delete(input.id)),

  retry: protectedProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => ctx.services.task.retry(input.id, "trigger")),

  cancel: protectedProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => ctx.services.task.cancel(input.id)),

  duplicate: protectedProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => ctx.services.task.duplicate(input.id)),

  // ==================== Batch Operations ====================

  batchDelete: protectedProcedure
    .input(idsSchema)
    .mutation(({ ctx, input }) => ctx.services.task.batchDelete(input.ids)),

  batchUpdateStatus: protectedProcedure
    .input(batchUpdateStatusSchema)
    .mutation(({ ctx, input }) => ctx.services.task.batchUpdateStatus(input.ids, input.status)),

  batchRetry: protectedProcedure
    .input(idsSchema)
    .mutation(({ ctx, input }) => ctx.services.task.batchRetry(input.ids, "trigger")),

  batchCancel: protectedProcedure
    .input(idsSchema)
    .mutation(({ ctx, input }) => ctx.services.task.batchCancel(input.ids)),

  // ==================== Export ====================

  export: protectedProcedure
    .input(exportSchema)
    .query(async ({ ctx, input }) => {
      const tasks = await ctx.services.task.export({
        ids: input.ids,
        status: input.status,
      });

      if (input.format === "csv") {
        const headers = [
          "id",
          "topic",
          "keywords",
          "status",
          "createdAt",
        ];

        const rows = tasks.map((task) => [
          task.id,
          task.topic ?? "",
          task.keywords ?? "",
          task.status ?? "",
          task.createdAt?.toISOString() ?? "",
        ]);

        const csvContent = [
          headers.join(","),
          ...rows.map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
          ),
        ].join("\n");

        return { format: "csv" as const, data: csvContent };
      }

      return { format: "json" as const, data: tasks };
    }),

  // ==================== Execution Management ====================

  getExecutions: protectedProcedure
    .input(idSchema)
    .query(({ ctx, input }) => ctx.services.task.getExecutions(input.id)),

  getLatestExecution: protectedProcedure
    .input(idSchema)
    .query(({ ctx, input }) => ctx.services.task.getLatestExecution(input.id)),

  createExecution: protectedProcedure
    .input(createExecutionSchema)
    .mutation(({ ctx, input }) => ctx.services.task.createExecution(input.taskId, input.n8nExecutionId)),

  // Public endpoint for n8n webhook to complete execution
  completeExecution: publicProcedure
    .input(completeExecutionSchema)
    .mutation(({ ctx, input }) => {
      const { executionId, ...result } = input;
      return ctx.services.task.completeExecution(executionId, result);
    }),
});
