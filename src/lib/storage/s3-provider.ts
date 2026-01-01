/**
 * AWS S3 Storage Provider
 *
 * Supports standard AWS S3 and S3-compatible services (MinIO, etc.)
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
  S3Config,
} from "./types"

export class S3Provider implements StorageProvider {
  private client: S3Client
  private bucket: string
  private publicDomain: string

  constructor(config: Omit<S3Config, "provider">) {
    const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }

    // Support custom endpoints for S3-compatible services
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint
      clientConfig.forcePathStyle = true
    }

    this.client = new S3Client(clientConfig)
    this.bucket = config.bucket
    this.publicDomain = config.publicDomain.replace(/\/$/, "")
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

  private generateKey(filename: string, folder?: string): string {
    const timestamp = Date.now()
    const randomSuffix = crypto.randomUUID().slice(0, 8)
    const sanitizedFilename = this.sanitizeFilename(filename)
    const key = `${timestamp}-${randomSuffix}-${sanitizedFilename}`
    return folder ? `${folder}/${key}` : key
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(0, 100)
  }
}
