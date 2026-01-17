import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const getAllInputSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const wechatArticleRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getAllInputSchema)
    .query(({ ctx, input }) => ctx.services.wechatArticle.getAll(input)),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => ctx.services.wechatArticle.getById(input.id)),
});
