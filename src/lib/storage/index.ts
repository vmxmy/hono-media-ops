/**
 * Storage Provider Factory
 *
 * Creates the appropriate storage provider based on configuration.
 */

import type { StorageProvider, StorageConfig, StorageProviderType } from "./types"
import { R2Provider } from "./r2-provider"
import { S3Provider } from "./s3-provider"
import { LocalProvider } from "./local-provider"

// ==================== Re-exports ====================

export type {
  StorageProvider,
  StorageConfig,
  StorageProviderType,
  PresignedUrlResult,
  GeneratePresignedUrlOptions,
  R2Config,
  S3Config,
  LocalConfig,
  UploadedFile,
  AllowedImageType,
} from "./types"

export { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES } from "./types"

export { R2Provider } from "./r2-provider"
export { S3Provider } from "./s3-provider"
export { LocalProvider } from "./local-provider"

// ==================== Factory ====================

export interface CreateStorageProviderOptions {
  provider: StorageProviderType
  // R2/S3 common
  bucket?: string
  accessKeyId?: string
  secretAccessKey?: string
  publicDomain?: string
  // R2 specific
  accountId?: string
  // S3 specific
  region?: string
  endpoint?: string
  // Local specific
  uploadDir?: string
  publicPath?: string
}

/**
 * Create a storage provider instance based on configuration
 */
export function createStorageProvider(
  options: CreateStorageProviderOptions
): StorageProvider {
  switch (options.provider) {
    case "r2": {
      if (
        !options.accountId ||
        !options.accessKeyId ||
        !options.secretAccessKey ||
        !options.bucket ||
        !options.publicDomain
      ) {
        throw new Error(
          "R2 provider requires: accountId, accessKeyId, secretAccessKey, bucket, publicDomain"
        )
      }
      return new R2Provider({
        accountId: options.accountId,
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        bucket: options.bucket,
        publicDomain: options.publicDomain,
      })
    }

    case "s3": {
      if (
        !options.accessKeyId ||
        !options.secretAccessKey ||
        !options.bucket ||
        !options.publicDomain
      ) {
        throw new Error(
          "S3 provider requires: accessKeyId, secretAccessKey, bucket, publicDomain"
        )
      }
      return new S3Provider({
        region: options.region ?? "us-east-1",
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        bucket: options.bucket,
        publicDomain: options.publicDomain,
        endpoint: options.endpoint,
      })
    }

    case "local": {
      return new LocalProvider({
        uploadDir: options.uploadDir ?? "./public/uploads",
        publicPath: options.publicPath ?? "/uploads",
      })
    }

    default:
      throw new Error(`Unknown storage provider: ${options.provider as string}`)
  }
}

// ==================== Singleton Instance ====================

let storageProviderInstance: StorageProvider | null = null

/**
 * Get the configured storage provider instance (singleton)
 * Lazily initialized on first call
 */
export function getStorageProvider(): StorageProvider {
  if (!storageProviderInstance) {
    // Import env dynamically to avoid circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { env } = require("@/env") as { env: Record<string, string | undefined> }

    const provider = (env.STORAGE_PROVIDER ?? "local") as StorageProviderType

    storageProviderInstance = createStorageProvider({
      provider,
      bucket: env.STORAGE_BUCKET,
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
      publicDomain: env.STORAGE_PUBLIC_DOMAIN,
      accountId: env.R2_ACCOUNT_ID,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      uploadDir: env.LOCAL_UPLOAD_DIR,
      publicPath: env.LOCAL_PUBLIC_PATH,
    })
  }

  return storageProviderInstance
}

/**
 * Reset the storage provider instance (useful for testing)
 */
export function resetStorageProvider(): void {
  storageProviderInstance = null
}
