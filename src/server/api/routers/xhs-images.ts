import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { idSchema, paginationSchema } from "../schemas/common";
import { XHS_IMAGE_JOB_STATUSES } from "@/lib/xhs-image-job-status";

const xhsJobStatusSchema = z.enum(XHS_IMAGE_JOB_STATUSES);

export const xhsImagesRouter = createTRPCRouter({
  // Get all jobs with pagination
  getAll: protectedProcedure
    .input(
      paginationSchema.extend({
        status: z.union([xhsJobStatusSchema, z.array(xhsJobStatusSchema)]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.services.xhsImage.getAllJobs({
        page: input.page,
        pageSize: input.pageSize,
        status: input.status,
        userId: ctx.session?.user?.id,
      });
    }),

  // Get single job with all images
  getById: protectedProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.xhsImage.getJobById(input.id);
    }),

  // Get images for a job
  getImages: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.services.xhsImage.getJobImages(input.jobId);
    }),

  // Get count of processing jobs (for polling indicator)
  getProcessingCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.xhsImage.getProcessingJobsCount(ctx.session?.user?.id);
  }),

  // Delete a job (soft delete)
  delete: protectedProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.xhsImage.deleteJob(input.id);
    }),

  // Cancel a job
  cancel: protectedProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.xhsImage.cancelJob(input.id);
    }),

  // Retry a job (create a new one)
  retry: protectedProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.xhsImage.retryJob(input.id);
    }),

  // Update job status
  updateStatus: protectedProcedure
    .input(
      idSchema.extend({
        status: xhsJobStatusSchema,
        errorMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.services.xhsImage.updateJobStatus(
        input.id,
        input.status,
        input.errorMessage
      );
    }),

  // Trigger XHS image generation
  generate: protectedProcedure
    .input(
      z.object({
        inputContent: z.string().min(1),
        promptId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new Error("User not authenticated");
      }
      return ctx.services.xhsImage.triggerGeneration({
        userId,
        inputContent: input.inputContent,
        promptId: input.promptId,
      });
    }),

  // Publish job to XHS
  publish: protectedProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.xhsImage.publishToXhs(input.id);
    }),
});
