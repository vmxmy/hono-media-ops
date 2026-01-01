/**
 * User Storage Config Router
 *
 * Endpoints for managing per-user storage configuration.
 */

import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "../trpc"

// ==================== Input Schemas ====================

const providerEnum = z.enum(["local", "r2", "s3"])

const upsertInputSchema = z.object({
  provider: providerEnum,
  bucket: z.string().max(255).optional(),
  accessKeyId: z.string().max(255).optional(),
  secretAccessKey: z.string().optional(), // Can be empty to keep existing
  publicDomain: z.string().max(500).optional(),
  r2AccountId: z.string().max(255).optional(),
  s3Region: z.string().max(50).optional(),
  s3Endpoint: z.string().max(500).optional(),
  name: z.string().max(100).optional(),
})

const setActiveSchema = z.object({
  isActive: z.boolean(),
})

const testConnectionInputSchema = z.object({
  provider: providerEnum,
  bucket: z.string().max(255).optional(),
  accessKeyId: z.string().max(255).optional(),
  secretAccessKey: z.string().optional(),
  publicDomain: z.string().max(500).optional(),
  r2AccountId: z.string().max(255).optional(),
  s3Region: z.string().max(50).optional(),
  s3Endpoint: z.string().max(500).optional(),
}).optional()

// ==================== Router ====================

export const userStorageConfigRouter = createTRPCRouter({
  /**
   * Get current user's storage config
   */
  get: protectedProcedure.query(({ ctx }) =>
    ctx.services.userStorageConfig.getByUserId(ctx.user.id)
  ),

  /**
   * Create or update storage config
   */
  upsert: protectedProcedure
    .input(upsertInputSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.userStorageConfig.upsert(ctx.user.id, input)
    ),

  /**
   * Delete storage config
   */
  delete: protectedProcedure.mutation(({ ctx }) =>
    ctx.services.userStorageConfig.delete(ctx.user.id)
  ),

  /**
   * Set config active/inactive
   */
  setActive: protectedProcedure
    .input(setActiveSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.userStorageConfig.setActive(ctx.user.id, input.isActive)
      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error ?? "Storage config activation failed",
        })
      }
      return result
    }),

  /**
   * Test storage connection
   * If input is provided, test with those values (for unsaved config)
   * Otherwise, test with saved config from database
   */
  testConnection: protectedProcedure
    .input(testConnectionInputSchema)
    .mutation(({ ctx, input }) =>
      ctx.services.userStorageConfig.testConnection(ctx.user.id, input)
    ),
})
