import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

// ==================== Input Schemas ====================

const getPublishedInputSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(10),
  search: z.string().optional(),
});

const getByIdInputSchema = z.object({
  id: z.string(),
});

// ==================== Router ====================

export const articlesRouter = createTRPCRouter({
  /**
   * Get published articles list (public, no auth required)
   */
  getPublished: publicProcedure
    .input(getPublishedInputSchema)
    .query(({ ctx, input }) => ctx.services.article.getPublished(input)),

  /**
   * Get single article by task ID (public, no auth required)
   */
  getById: publicProcedure
    .input(getByIdInputSchema)
    .query(({ ctx, input }) => ctx.services.article.getByTaskId(input.id)),
});
