/**
 * Storage Provider Abstraction Layer
 *
 * Provides a unified interface for different storage backends (R2, S3, local filesystem).
 * Uses presigned URLs for direct client-to-storage uploads.
 */

// ==================== Core Types ====================

export interface PresignedUrlResult {
  /** URL for PUT upload (presigned, expires) */
  uploadUrl: string
  /** Final publicly accessible URL */
  publicUrl: string
  /** Storage key/path */
  key: string
  /** When the presigned URL expires */
  expiresAt: Date
}

export interface GeneratePresignedUrlOptions {
  /** Original filename */
  filename: string
  /** MIME type (e.g., "image/png") */
  contentType: string
  /** Storage folder/prefix (e.g., "uploads/images") */
  folder?: string
  /** Presigned URL expiration in seconds (default: 3600) */
  expiresInSeconds?: number
}

// ==================== Provider Interface ====================

export interface StorageProvider {
  /**
   * Generate a presigned URL for direct client upload
   */
  generatePresignedUrl(options: GeneratePresignedUrlOptions): Promise<PresignedUrlResult>

  /**
   * Get public URL for an existing object
   */
  getPublicUrl(key: string): string

  /**
   * Delete an object from storage
   */
  deleteObject(key: string): Promise<void>

  /**
   * Check if an object exists
   */
  objectExists(key: string): Promise<boolean>
}

// ==================== Provider Types ====================

export type StorageProviderType = "r2" | "s3" | "local"

// ==================== Provider Configs ====================

export interface R2Config {
  provider: "r2"
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicDomain: string
}

export interface S3Config {
  provider: "s3"
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicDomain: string
  endpoint?: string // For S3-compatible services
}

export interface LocalConfig {
  provider: "local"
  uploadDir: string // e.g., "./public/uploads"
  publicPath: string // e.g., "/uploads"
}

export type StorageConfig = R2Config | S3Config | LocalConfig

// ==================== Utility Types ====================

export interface UploadedFile {
  key: string
  publicUrl: string
  filename: string
  contentType: string
  sizeBytes?: number
}

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
