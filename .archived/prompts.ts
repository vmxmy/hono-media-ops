import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// Input validation schemas
const createInputSchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
  category: z.string().default("default"),
  description: z.string().optional(),
});

const updateInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  content: z.string().min(1),
  category: z.string().default("default"),
  description: z.string().optional(),
});

const idSchema = z.object({ id: z.string() });

// Router definition - delegates to service layer
export const promptsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .query(({ ctx }) => ctx.services.prompt.getAll()),

  getById: protectedProcedure
    .input(idSchema)
    .query(({ ctx, input }) => ctx.services.prompt.getById(input.id)),

  create: protectedProcedure
    .input(createInputSchema)
    .mutation(({ ctx, input }) => ctx.services.prompt.create(input)),

  update: protectedProcedure
    .input(updateInputSchema)
    .mutation(({ ctx, input }) => ctx.services.prompt.update(input)),

  delete: protectedProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => ctx.services.prompt.delete(input.id)),
});
