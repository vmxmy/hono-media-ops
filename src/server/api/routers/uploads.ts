/**
 * Uploads Router
 *
 * Handles presigned URL generation for image uploads.
 */

import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"

// ==================== Input Schemas ====================

const getPresignedUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^image\/(jpeg|png|gif|webp|svg\+xml)$/, {
    message: "Only image files are allowed (jpeg, png, gif, webp, svg)",
  }),
  folder: z.string().max(100).optional(),
})

const deleteFileSchema = z.object({
  key: z.string().min(1).max(500),
})

const fileExistsSchema = z.object({
  key: z.string().min(1).max(500),
})

// ==================== Router ====================

export const uploadsRouter = createTRPCRouter({
  /**
   * Get a presigned URL for uploading an image
   * Returns the upload URL (for PUT) and the final public URL
   * Uses user's storage config if active
   */
  getPresignedUrl: protectedProcedure
    .input(getPresignedUrlSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.storage.getPresignedUrl({
        filename: input.filename,
        contentType: input.contentType,
        folder: input.folder,
        userId: ctx.user.id, // Use user's storage config if active
      })
    ),

  /**
   * Delete an uploaded file by its storage key
   */
  deleteFile: protectedProcedure
    .input(deleteFileSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.storage.deleteFile({
        key: input.key,
        userId: ctx.user.id,
      })
    ),

  /**
   * Check if a file exists
   */
  fileExists: protectedProcedure
    .input(fileExistsSchema)
    .query(async ({ ctx, input }) => ({
      exists: await ctx.services.storage.fileExists(input.key, ctx.user.id),
    })),

  /**
   * Get upload constraints (allowed types, max size)
   */
  getConstraints: protectedProcedure.query(({ ctx }) => ({
    allowedTypes: ctx.services.storage.getAllowedTypes(),
    maxFileSize: ctx.services.storage.getMaxFileSize(),
  })),
})
