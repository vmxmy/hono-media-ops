/**
 * Export Router
 *
 * tRPC endpoints for exporting articles to various formats.
 */

import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"

// ==================== Validation Schemas ====================

const stylePresetSchema = z.enum(["default", "elegant", "tech"])

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
})
