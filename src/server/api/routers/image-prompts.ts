import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// Input validation schemas
const getAllInputSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  isPublic: z.boolean().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

const createInputSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  model: z.string().optional(),
  ratio: z.string().optional(),
  resolution: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  previewUrl: z.string().optional(),
  previewR2Key: z.string().optional(),
  source: z.enum(["manual", "ai", "imported"]).optional(),
  sourceRef: z.string().optional(),
  isPublic: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateInputSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  negativePrompt: z.string().optional(),
  model: z.string().optional(),
  ratio: z.string().optional(),
  resolution: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  previewUrl: z.string().optional(),
  previewR2Key: z.string().optional(),
  isPublic: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const idSchema = z.object({ id: z.string() });

const batchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1),
});

const ratingSchema = z.object({
  id: z.string(),
  rating: z.number().min(0).max(5),
});

const duplicateSchema = z.object({
  id: z.string(),
});

const categorySchema = z.object({
  category: z.string(),
});

// Router definition - delegates to service layer
export const imagePromptsRouter = createTRPCRouter({
  // Get all with filtering and pagination
  getAll: protectedProcedure
    .input(getAllInputSchema)
    .query(({ ctx, input }) =>
      ctx.services.imagePrompt.getAll({
        ...input,
        userId: ctx.user.id,
      })
    ),

  // Get by ID
  getById: protectedProcedure
    .input(idSchema)
    .query(({ ctx, input }) => ctx.services.imagePrompt.getById(input.id)),

  // Get by category
  getByCategory: protectedProcedure
    .input(categorySchema)
    .query(({ ctx, input }) =>
      ctx.services.imagePrompt.getByCategory(input.category, ctx.user.id)
    ),

  // Search
  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(({ ctx, input }) =>
      ctx.services.imagePrompt.search(input.query, ctx.user.id)
    ),

  // Create
  create: protectedProcedure
    .input(createInputSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.imagePrompt.create({
        ...input,
        userId: ctx.user.id,
      })
    ),

  // Update
  update: protectedProcedure
    .input(updateInputSchema)
    .mutation(({ ctx, input }) => ctx.services.imagePrompt.update(input)),

  // Delete
  delete: protectedProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => ctx.services.imagePrompt.delete(input.id)),

  // Batch delete
  batchDelete: protectedProcedure
    .input(batchDeleteSchema)
    .mutation(({ ctx, input }) => ctx.services.imagePrompt.batchDelete(input.ids)),

  // Increment use count
  incrementUseCount: protectedProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => ctx.services.imagePrompt.incrementUseCount(input.id)),

  // Update rating
  updateRating: protectedProcedure
    .input(ratingSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.imagePrompt.updateRating(input.id, input.rating)
    ),

  // Toggle public status
  togglePublic: protectedProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => ctx.services.imagePrompt.togglePublic(input.id)),

  // Get categories
  getCategories: protectedProcedure
    .query(({ ctx }) => ctx.services.imagePrompt.getCategories()),

  // Get top prompts (public)
  getTopPrompts: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(({ ctx, input }) => ctx.services.imagePrompt.getTopPrompts(input.limit)),

  // Duplicate
  duplicate: protectedProcedure
    .input(duplicateSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.imagePrompt.duplicate(input.id, ctx.user.id)
    ),
});
