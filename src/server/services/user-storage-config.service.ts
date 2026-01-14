/**
 * User Storage Config Service
 *
 * Manages per-user storage configuration for S3/R2 uploads.
 */

import { eq } from "drizzle-orm"
import { db } from "@/server/db"
import {
  userStorageConfigs,
  type UserStorageConfig,
} from "@/server/db/schema"
import { createStorageProvider } from "@/lib/storage"
import type { StorageProviderType } from "@/lib/storage"
import { encrypt, decryptSafe } from "@/lib/crypto"

// ==================== Types ====================

export type StorageProvider = "local" | "r2" | "s3"

export interface UserStorageConfigInput {
  provider: StorageProvider
  bucket?: string
  accessKeyId?: string
  secretAccessKey?: string
  publicDomain?: string
  r2AccountId?: string
  s3Region?: string
  s3Endpoint?: string
  name?: string
}

export interface UserStorageConfigSafeOutput {
  id: string
  userId: string
  provider: StorageProvider
  isActive: boolean
  bucket: string | null
  accessKeyId: string | null
  hasSecretKey: boolean // Never expose actual secret
  publicDomain: string | null
  r2AccountId: string | null
  s3Region: string | null
  s3Endpoint: string | null
  name: string | null
  createdAt: Date
  updatedAt: Date
}

// ==================== Helpers ====================

/**
 * Convert database record to safe output (mask secret key)
 */
function toSafeOutput(config: UserStorageConfig): UserStorageConfigSafeOutput {
  return {
    id: config.id,
    userId: config.userId,
    provider: config.provider as StorageProvider,
    isActive: config.isActive === 1,
    bucket: config.bucket,
    accessKeyId: config.accessKeyId,
    hasSecretKey: !!config.secretAccessKey,
    publicDomain: config.publicDomain,
    r2AccountId: config.r2AccountId,
    s3Region: config.s3Region,
    s3Endpoint: config.s3Endpoint,
    name: config.name,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  }
}

function validateConfigForRemoteProvider(config: UserStorageConfig): string | null {
  if (config.provider === "local") {
    return "Local provider cannot be activated"
  }
  if (!config.bucket || !config.accessKeyId || !config.secretAccessKey || !config.publicDomain) {
    return "Missing required fields: bucket, accessKeyId, secretAccessKey, publicDomain"
  }
  if (config.provider === "r2" && !config.r2AccountId) {
    return "R2 requires accountId"
  }
  return null
}

// ==================== Service ====================

export const userStorageConfigService = {
  /**
   * Get storage config for a user (safe output, no secret key)
   */
  async getByUserId(userId: string): Promise<UserStorageConfigSafeOutput | null> {
    const [config] = await db
      .select()
      .from(userStorageConfigs)
      .where(eq(userStorageConfigs.userId, userId))
      .limit(1)

    return config ? toSafeOutput(config) : null
  },

  /**
   * Get full config including secret key (internal use only)
   * Decrypts the secret access key before returning
   */
  async getFullConfigByUserId(userId: string): Promise<UserStorageConfig | null> {
    const [config] = await db
      .select()
      .from(userStorageConfigs)
      .where(eq(userStorageConfigs.userId, userId))
      .limit(1)

    if (!config) return null

    // Decrypt the secret access key if present
    return {
      ...config,
      secretAccessKey: decryptSafe(config.secretAccessKey),
    }
  },

  /**
   * Create or update storage config for a user
   */
  async upsert(
    userId: string,
    input: UserStorageConfigInput
  ): Promise<UserStorageConfigSafeOutput> {
    const existing = await this.getFullConfigByUserId(userId)

    if (existing) {
      // Update existing config
      const updateData: Partial<typeof userStorageConfigs.$inferInsert> = {
        provider: input.provider,
        bucket: input.bucket ?? null,
        accessKeyId: input.accessKeyId ?? null,
        publicDomain: input.publicDomain ?? null,
        r2AccountId: input.r2AccountId ?? null,
        s3Region: input.s3Region ?? "us-east-1",
        s3Endpoint: input.s3Endpoint ?? null,
        name: input.name ?? null,
        updatedAt: new Date(),
      }

      // Only update secret key if provided (not empty)
      // Encrypt the secret before storing
      if (input.secretAccessKey) {
        updateData.secretAccessKey = encrypt(input.secretAccessKey)
      }

      const [updated] = await db
        .update(userStorageConfigs)
        .set(updateData)
        .where(eq(userStorageConfigs.id, existing.id))
        .returning()

      return toSafeOutput(updated!)
    }

    // Create new config
    // Encrypt the secret before storing
    const [created] = await db
      .insert(userStorageConfigs)
      .values({
        userId,
        provider: input.provider,
        bucket: input.bucket ?? null,
        accessKeyId: input.accessKeyId ?? null,
        secretAccessKey: input.secretAccessKey ? encrypt(input.secretAccessKey) : null,
        publicDomain: input.publicDomain ?? null,
        r2AccountId: input.r2AccountId ?? null,
        s3Region: input.s3Region ?? "us-east-1",
        s3Endpoint: input.s3Endpoint ?? null,
        name: input.name ?? null,
        isActive: 0,
      })
      .returning()

    return toSafeOutput(created!)
  },

  /**
   * Delete storage config for a user
   */
  async delete(userId: string): Promise<{ success: boolean }> {
    await db
      .delete(userStorageConfigs)
      .where(eq(userStorageConfigs.userId, userId))

    return { success: true }
  },

  /**
   * Set config active/inactive
   */
  async setActive(
    userId: string,
    isActive: boolean
  ): Promise<{ success: boolean; error?: string }> {
    if (isActive) {
      const testResult = await this.testConnection(userId)
      if (!testResult.success) {
        return { success: false, error: testResult.error }
      }
    }

    await db
      .update(userStorageConfigs)
      .set({
        isActive: isActive ? 1 : 0,
        updatedAt: new Date(),
      })
      .where(eq(userStorageConfigs.userId, userId))

    return { success: true }
  },

  /**
   * Test storage connection
   * If testInput is provided, use those values (for testing unsaved config)
   * Falls back to saved secret key if not provided in testInput
   */
  async testConnection(
    userId: string,
    testInput?: Omit<UserStorageConfigInput, "name">
  ): Promise<{ success: boolean; error?: string }> {
    const savedConfig = await this.getFullConfigByUserId(userId)

    // Determine which values to use for testing
    const provider = testInput?.provider ?? savedConfig?.provider ?? "local"
    const bucket = testInput?.bucket ?? savedConfig?.bucket
    const accessKeyId = testInput?.accessKeyId ?? savedConfig?.accessKeyId
    // Use provided secret, or fall back to saved secret if testing unsaved changes
    const secretAccessKey = testInput?.secretAccessKey || savedConfig?.secretAccessKey
    const publicDomain = testInput?.publicDomain ?? savedConfig?.publicDomain
    const r2AccountId = testInput?.r2AccountId ?? savedConfig?.r2AccountId
    const s3Region = testInput?.s3Region ?? savedConfig?.s3Region ?? "us-east-1"
    const s3Endpoint = testInput?.s3Endpoint ?? savedConfig?.s3Endpoint

    if (provider === "local") {
      return { success: true }
    }

    // Validate required fields
    if (!bucket || !accessKeyId || !secretAccessKey || !publicDomain) {
      return { success: false, error: "Missing required fields: bucket, accessKeyId, secretAccessKey, publicDomain" }
    }
    if (provider === "r2" && !r2AccountId) {
      return { success: false, error: "R2 requires accountId" }
    }

    try {
      // Create a test provider and try to check if a test object exists
      const storageProvider = createStorageProvider({
        provider: provider as StorageProviderType,
        bucket,
        accessKeyId,
        secretAccessKey,
        publicDomain,
        accountId: r2AccountId ?? undefined,
        region: s3Region,
        endpoint: s3Endpoint ?? undefined,
      })

      // Try to check if a non-existent object exists (this tests the connection)
      await storageProvider.objectExists("__connection_test__")

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection test failed"
      return { success: false, error: message }
    }
  },
}

export type UserStorageConfigService = typeof userStorageConfigService
