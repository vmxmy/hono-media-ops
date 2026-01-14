/**
 * Local Filesystem Storage Provider
 *
 * For development and self-hosted deployments.
 * Uses a signed token approach to secure uploads via an API route.
 */

import { createHmac, randomBytes } from "crypto"
import { promises as fs } from "fs"
import path from "path"
import type {
  StorageProvider,
  PresignedUrlResult,
  GeneratePresignedUrlOptions,
  LocalConfig,
} from "./types"

/**
 * Get the upload secret for signing tokens
 * In production, requires LOCAL_UPLOAD_SECRET to be set (min 32 chars)
 * In development, falls back to a randomly generated secret per process
 */
function getUploadSecret(): string {
  const secret = process.env.LOCAL_UPLOAD_SECRET
  if (secret) {
    return secret
  }

  // In production, require explicit secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("LOCAL_UPLOAD_SECRET must be set in production (min 32 characters)")
  }

  // Development fallback: generate a random secret per process
  // This means tokens won't persist across restarts, which is fine for dev
  console.warn("[LocalProvider] Using random secret for development. Set LOCAL_UPLOAD_SECRET for persistence.")
  return randomBytes(32).toString("hex")
}

// Lazy-initialized secret
let uploadSecret: string | null = null
function getSecret(): string {
  if (!uploadSecret) {
    uploadSecret = getUploadSecret()
  }
  return uploadSecret
}

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
    const signature = createHmac("sha256", getSecret())
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

      // Verify signature using the same secret derivation
      const secret = process.env.LOCAL_UPLOAD_SECRET
      if (!secret && process.env.NODE_ENV === "production") {
        console.error("[LocalProvider] LOCAL_UPLOAD_SECRET not set in production")
        return null
      }

      // In development without secret, we can't verify tokens from previous sessions
      if (!secret) {
        console.warn("[LocalProvider] Cannot verify token without LOCAL_UPLOAD_SECRET")
        return null
      }

      const expectedSignature = createHmac("sha256", secret)
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
