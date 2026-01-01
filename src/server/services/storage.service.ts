/**
 * Storage Service
 *
 * Provides presigned URL generation and file management for image uploads.
 * Uses the storage provider abstraction for R2/S3/local support.
 * Supports per-user storage configuration.
 */

import {
  getStorageProvider,
  createStorageProvider,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/storage"
import type { AllowedImageType, StorageProvider, StorageProviderType } from "@/lib/storage"
import { userStorageConfigService } from "./user-storage-config.service"

// ==================== Types ====================

export interface GetPresignedUrlInput {
  filename: string
  contentType: string
  folder?: string
  userId?: string // Optional: use user's storage config if active
}

export interface GetPresignedUrlResult {
  uploadUrl: string
  publicUrl: string
  key: string
  expiresAt: Date
}

export interface DeleteFileInput {
  key: string
  userId?: string
}

// ==================== Validation ====================

function isAllowedImageType(contentType: string): contentType is AllowedImageType {
  return ALLOWED_IMAGE_TYPES.includes(contentType as AllowedImageType)
}

// ==================== Provider Resolution ====================

/**
 * Get storage provider for a user (uses user config if active, falls back to system default)
 */
async function getProviderForUser(userId?: string): Promise<StorageProvider> {
  if (!userId) {
    return getStorageProvider()
  }

  // Check if user has an active storage config
  const userConfig = await userStorageConfigService.getFullConfigByUserId(userId)

  if (!userConfig || userConfig.isActive !== 1 || userConfig.provider === "local") {
    return getStorageProvider()
  }

  // Use user's storage config
  return createStorageProvider({
    provider: userConfig.provider as StorageProviderType,
    bucket: userConfig.bucket ?? undefined,
    accessKeyId: userConfig.accessKeyId ?? undefined,
    secretAccessKey: userConfig.secretAccessKey ?? undefined,
    publicDomain: userConfig.publicDomain ?? undefined,
    accountId: userConfig.r2AccountId ?? undefined,
    region: userConfig.s3Region ?? "us-east-1",
    endpoint: userConfig.s3Endpoint ?? undefined,
  })
}

// ==================== Service ====================

export const storageService = {
  /**
   * Generate a presigned URL for client-side image upload
   * If userId is provided and user has active storage config, uses that config
   */
  async getPresignedUrl(input: GetPresignedUrlInput): Promise<GetPresignedUrlResult> {
    // Validate content type
    if (!isAllowedImageType(input.contentType)) {
      throw new Error(
        `Unsupported content type: ${input.contentType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`
      )
    }

    const provider = await getProviderForUser(input.userId)
    const result = await provider.generatePresignedUrl({
      filename: input.filename,
      contentType: input.contentType,
      folder: input.folder ?? "uploads/images",
      expiresInSeconds: 3600, // 1 hour
    })

    return result
  },

  /**
   * Delete an uploaded file
   */
  async deleteFile(input: DeleteFileInput): Promise<{ success: boolean }> {
    const provider = await getProviderForUser(input.userId)
    await provider.deleteObject(input.key)
    return { success: true }
  },

  /**
   * Check if a file exists
   */
  async fileExists(key: string, userId?: string): Promise<boolean> {
    const provider = await getProviderForUser(userId)
    return provider.objectExists(key)
  },

  /**
   * Get the public URL for a file
   */
  async getPublicUrl(key: string, userId?: string): Promise<string> {
    const provider = await getProviderForUser(userId)
    return provider.getPublicUrl(key)
  },

  /**
   * Get allowed image types
   */
  getAllowedTypes(): readonly string[] {
    return ALLOWED_IMAGE_TYPES
  },

  /**
   * Get max file size in bytes
   */
  getMaxFileSize(): number {
    return MAX_FILE_SIZE_BYTES
  },
}

export type StorageService = typeof storageService
