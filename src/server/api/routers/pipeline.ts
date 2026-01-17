import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// ==================== Input Schemas ====================

const pipelineStatusSchema = z.enum([
  "analyzing",
  "pending_selection",
  "processing",
  "completed",
  "failed",
]);

const createInputSchema = z.object({
  sourceUrl: z.string().url(),
  topic: z.string().min(1),
  keywords: z.string().optional(),
  targetWordCount: z.number().int().min(500).max(10000).optional(),
});

const createQuickInputSchema = z.object({
  styleAnalysisId: z.string().uuid(),
  imagePromptId: z.string().uuid(),
  topic: z.string().min(1),
  keywords: z.string().optional(),
  targetWordCount: z.number().int().min(500).max(10000).optional(),
});

const selectStyleInputSchema = z.object({
  pipelineId: z.string().uuid(),
  imagePromptId: z.string().uuid(),
});

const updateProgressInputSchema = z.object({
  pipelineId: z.string().uuid(),
  articleTotalChapters: z.number().int().optional(),
  articleCompletedChapters: z.number().int().optional(),
  xhsTotalImages: z.number().int().optional(),
  xhsCompletedImages: z.number().int().optional(),
  status: pipelineStatusSchema.optional(),
  errorMessage: z.string().optional(),
});

// ==================== Router ====================

export const pipelineRouter = createTRPCRouter({
  // 获取用户的 pipeline 列表
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
        status: pipelineStatusSchema.optional(),
      })
    )
    .query(({ ctx, input }) =>
      ctx.services.pipeline.getAll({
        userId: ctx.user.id,
        ...input,
      })
    ),

  // 获取单个 pipeline
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.services.pipeline.getById(input.id, ctx.user.id)
    ),

  // 获取进度
  getProgress: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => ctx.services.pipeline.getProgress(input.id)),

  // 创建新 pipeline（触发风格分析）
  create: protectedProcedure
    .input(createInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.pipeline.create({
        userId: ctx.user.id,
        ...input,
      });
      // 触发风格分析 webhook
      await ctx.services.pipeline.triggerStyleAnalysis(result.id);
      return result;
    }),

  // 快速创建并直接开始生成
  createQuick: protectedProcedure
    .input(createQuickInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.pipeline.createQuick({
        userId: ctx.user.id,
        ...input,
      });
      await ctx.services.pipeline.triggerContentGeneration(result.id);
      return result;
    }),

  // 获取排序后的封面风格列表
  getSortedImagePrompts: protectedProcedure
    .input(z.object({ pipelineId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const pipeline = await ctx.services.pipeline.getById(
        input.pipelineId,
        ctx.user.id
      );
      if (!pipeline?.styleAnalysisId) return [];
      return ctx.services.pipeline.getSortedImagePrompts(
        pipeline.styleAnalysisId
      );
    }),

  // 选择封面风格
  selectStyle: protectedProcedure
    .input(selectStyleInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate pipeline exists and is in correct state
      const pipeline = await ctx.services.pipeline.getById(
        input.pipelineId,
        ctx.user.id
      );
      if (!pipeline) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found or access denied",
        });
      }
      if (
        pipeline.status !== "analyzing" &&
        pipeline.status !== "pending_selection"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot select style for pipeline in current state",
        });
      }

      await ctx.services.pipeline.update(
        {
          id: input.pipelineId,
          imagePromptId: input.imagePromptId,
        },
        ctx.user.id
      );
      return { success: true };
    }),

  // 开始生成
  start: protectedProcedure
    .input(z.object({ pipelineId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const pipeline = await ctx.services.pipeline.getById(
        input.pipelineId,
        ctx.user.id
      );
      if (!pipeline) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found or access denied",
        });
      }
      if (pipeline.status !== "pending_selection") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot start pipeline that is not in pending_selection state",
        });
      }
      if (!pipeline.imagePromptId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must select an image style before starting",
        });
      }

      await ctx.services.pipeline.update(
        {
          id: input.pipelineId,
          status: "processing",
        },
        ctx.user.id
      );
      // 触发文章生成 webhook
      await ctx.services.pipeline.triggerContentGeneration(input.pipelineId);
      return { success: true };
    }),

  // Webhook 回调更新进度（公开接口）
  updateProgress: publicProcedure
    .input(updateProgressInputSchema)
    .mutation(({ ctx, input }) => {
      const { pipelineId, ...data } = input;
      return ctx.services.pipeline.update({ id: pipelineId, ...data });
    }),

  // 删除
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      ctx.services.pipeline.delete(input.id, ctx.user.id)
    ),

  // 再来一篇
  cloneWithNewTopic: protectedProcedure
    .input(
      z.object({
        pipelineId: z.string().uuid(),
        newTopic: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.services.pipeline.getById(
        input.pipelineId,
        ctx.user.id
      );
      if (!original) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found or access denied",
        });
      }

      const result = await ctx.services.pipeline.create({
        userId: ctx.user.id,
        sourceUrl: original.sourceUrl,
        topic: input.newTopic,
        keywords: original.keywords ?? undefined,
        targetWordCount: original.targetWordCount ?? undefined,
      });

      // 复用风格选择
      if (original.imagePromptId) {
        await ctx.services.pipeline.update(
          {
            id: result.id,
            styleAnalysisId: original.styleAnalysisId ?? undefined,
            imagePromptId: original.imagePromptId,
          },
          ctx.user.id
        );
      }

      return result;
    }),

  // ==================== Analytics ====================

  /** 获取 Pipeline 统计信息 */
  getStatistics: protectedProcedure
    .input(z.object({
      timeRange: z.object({
        start: z.date(),
        end: z.date(),
      }).optional(),
    }))
    .query(({ ctx, input }) => ctx.services.pipeline.getStatistics(
      ctx.user.id,
      input.timeRange
    )),
});
