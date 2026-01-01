/**
 * Local Filesystem Storage Provider
 *
 * For development and self-hosted deployments.
 * Uses a signed token approach to secure uploads via an API route.
 */

import { createHmac } from "crypto"
import { promises as fs } from "fs"
import path from "path"
import type {
  StorageProvider,
  PresignedUrlResult,
  GeneratePresignedUrlOptions,
  LocalConfig,
} from "./types"

// Secret for signing upload tokens (use env in production)
const UPLOAD_SECRET = process.env.LOCAL_UPLOAD_SECRET ?? "dev-upload-secret"

export class LocalProvider implements StorageProvider {
  private uploadDir: string
  private publicPath: string

  constructor(config: Omit<LocalConfig, "provider">) {
    this.uploadDir = config.uploadDir
    this.publicPath = config.publicPath.replace(/\/$/, "")
  }

  async generatePresignedUrl(
    options: GeneratePresignedUrlOptions
  ): Promise<PresignedUrlResult> {
    const expiresInSeconds = options.expiresInSeconds ?? 3600
    const key = this.generateKey(options.filename, options.folder)
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

    // Create a signed token for the upload
    const token = this.createUploadToken({
      key,
      contentType: options.contentType,
      expiresAt: expiresAt.getTime(),
    })

    // The upload URL points to our API route
    const uploadUrl = `/api/upload/local?token=${encodeURIComponent(token)}`

    return {
      uploadUrl,
      publicUrl: this.getPublicUrl(key),
      key,
      expiresAt,
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicPath}/${key}`
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key)
    try {
      await fs.unlink(filePath)
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error
      }
    }
  }

  async objectExists(key: string): Promise<boolean> {
    const filePath = path.join(this.uploadDir, key)
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Save a file to local storage (called by the API route)
   */
  async saveFile(key: string, data: Buffer): Promise<void> {
    const filePath = path.join(this.uploadDir, key)
    const dir = path.dirname(filePath)

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(filePath, data)
  }

  /**
   * Create a signed token for upload authorization
   */
  private createUploadToken(payload: {
    key: string
    contentType: string
    expiresAt: number
  }): string {
    const data = JSON.stringify(payload)
    const signature = createHmac("sha256", UPLOAD_SECRET)
      .update(data)
      .digest("hex")
    return Buffer.from(JSON.stringify({ data, signature })).toString("base64url")
  }

  /**
   * Verify and decode an upload token
   */
  static verifyUploadToken(token: string): {
    key: string
    contentType: string
    expiresAt: number
  } | null {
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64url").toString())
      const { data, signature } = decoded as { data: string; signature: string }

      // Verify signature
      const expectedSignature = createHmac("sha256", UPLOAD_SECRET)
        .update(data)
        .digest("hex")

      if (signature !== expectedSignature) {
        return null
      }

      const payload = JSON.parse(data) as {
        key: string
        contentType: string
        expiresAt: number
      }

      // Check expiration
      if (Date.now() > payload.expiresAt) {
        return null
      }

      return payload
    } catch {
      return null
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
