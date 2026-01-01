/**
 * Cloudflare R2 Storage Provider
 *
 * Uses AWS SDK v3 with S3-compatible API for Cloudflare R2.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import type {
  StorageProvider,
  PresignedUrlResult,
  GeneratePresignedUrlOptions,
  R2Config,
} from "./types"

export class R2Provider implements StorageProvider {
  private client: S3Client
  private bucket: string
  private publicDomain: string

  constructor(config: Omit<R2Config, "provider">) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
    this.bucket = config.bucket
    this.publicDomain = config.publicDomain.replace(/\/$/, "") // Remove trailing slash
  }

  async generatePresignedUrl(
    options: GeneratePresignedUrlOptions
  ): Promise<PresignedUrlResult> {
    const expiresInSeconds = options.expiresInSeconds ?? 3600
    const key = this.generateKey(options.filename, options.folder)

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: options.contentType,
    })

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    })

    return {
      uploadUrl,
      publicUrl: this.getPublicUrl(key),
      key,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicDomain}/${key}`
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    )
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )
      return true
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
      if (status === 404) {
        return false
      }
      throw error
    }
  }

  /**
   * Generate a unique storage key for the file
   * Format: {folder}/{timestamp}-{uuid}-{sanitizedFilename}
   */
  private generateKey(filename: string, folder?: string): string {
    const timestamp = Date.now()
    const randomSuffix = crypto.randomUUID().slice(0, 8)
    const sanitizedFilename = this.sanitizeFilename(filename)
    const key = `${timestamp}-${randomSuffix}-${sanitizedFilename}`
    return folder ? `${folder}/${key}` : key
  }

  /**
   * Sanitize filename for safe storage
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(0, 100) // Limit length
  }
}
