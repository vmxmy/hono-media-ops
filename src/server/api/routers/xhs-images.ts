import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const xhsJobStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);

export const xhsImagesRouter = createTRPCRouter({
  // Get all jobs with pagination
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
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
    .input(z.object({ id: z.string().uuid() }))
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
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.xhsImage.deleteJob(input.id);
    }),

  // Update job status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
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
});
