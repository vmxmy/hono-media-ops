/**
 * Export Router
 *
 * tRPC endpoints for exporting articles to various formats.
 */

import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"

// ==================== Validation Schemas ====================

const stylePresetSchema = z.enum(["default", "elegant", "tech", "modern"])

const wechatExportInputSchema = z.object({
  executionId: z.string(),
  stylePreset: stylePresetSchema.optional(),
})

const markdownExportInputSchema = z.object({
  executionId: z.string(),
})

const exportInfoInputSchema = z.object({
  executionId: z.string(),
})

const wechatPublishInputSchema = z.object({
  title: z.string().min(1),
  html: z.string().min(1),
  thumbMediaId: z.string().optional(),
  author: z.string().optional(),
  digest: z.string().optional(),
})

// ==================== Router ====================

export const exportRouter = createTRPCRouter({
  /**
   * Export article to WeChat-compatible HTML
   */
  toWechat: protectedProcedure
    .input(wechatExportInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.export.toWechat(input.executionId, {
        stylePreset: input.stylePreset,
      })
    }),

  /**
   * Export article as Markdown file
   */
  toMarkdown: protectedProcedure
    .input(markdownExportInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.export.toMarkdown(input.executionId)
    }),

  /**
   * Get export info/capabilities for an article
   */
  getInfo: protectedProcedure
    .input(exportInfoInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.export.getExportInfo(input.executionId)
    }),

  /**
   * Publish article to WeChat Official Account
   */
  publishToWechat: protectedProcedure
    .input(wechatPublishInputSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.export.publishToWechat(input)
    }),
})
