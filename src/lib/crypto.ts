/**
 * Encryption utilities for sensitive data storage
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

// ============================================================================
// Configuration
// ============================================================================

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32
const KEY_LENGTH = 32

// ============================================================================
// Key Derivation
// ============================================================================

/**
 * Derives an encryption key from the master secret using scrypt
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH)
}

/**
 * Gets the encryption key from environment
 * Falls back to AUTH_SECRET if ENCRYPTION_KEY is not set
 */
function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_KEY ?? process.env.AUTH_SECRET
  if (!secret) {
    throw new Error("ENCRYPTION_KEY or AUTH_SECRET must be set for credential encryption")
  }
  return secret
}

// ============================================================================
// Encryption / Decryption
// ============================================================================

/**
 * Encrypts a string using AES-256-GCM
 * Returns a base64-encoded string containing: salt + iv + authTag + ciphertext
 *
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded encrypted data
 *
 * @example
 * ```ts
 * const encrypted = encrypt("my-secret-access-key")
 * // Returns: "base64encodedstring..."
 * ```
 */
export function encrypt(plaintext: string): string {
  const secret = getEncryptionSecret()

  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)

  // Derive key from secret
  const key = deriveKey(secret, salt)

  // Create cipher and encrypt
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])

  // Get authentication tag
  const authTag = cipher.getAuthTag()

  // Combine: salt + iv + authTag + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted])

  return combined.toString("base64")
}

/**
 * Decrypts a string that was encrypted with encrypt()
 *
 * @param encryptedData - Base64-encoded encrypted data
 * @returns The original plaintext string
 *
 * @example
 * ```ts
 * const decrypted = decrypt("base64encodedstring...")
 * // Returns: "my-secret-access-key"
 * ```
 */
export function decrypt(encryptedData: string): string {
  const secret = getEncryptionSecret()

  // Decode from base64
  const combined = Buffer.from(encryptedData, "base64")

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

  // Derive key from secret
  const key = deriveKey(secret, salt)

  // Create decipher and decrypt
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}

/**
 * Checks if a string appears to be encrypted (base64 with correct length)
 * Used to detect if migration is needed
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false

  try {
    const decoded = Buffer.from(value, "base64")
    // Minimum length: salt (32) + iv (16) + authTag (16) + at least 1 byte ciphertext
    return decoded.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1
  } catch {
    return false
  }
}

/**
 * Encrypts a value only if it's not already encrypted
 * Useful for migrations
 */
export function encryptIfNeeded(value: string | null | undefined): string | null {
  if (!value) return null
  if (isEncrypted(value)) return value
  return encrypt(value)
}

/**
 * Decrypts a value, returning null if it fails
 * Useful for handling potentially unencrypted legacy data
 */
export function decryptSafe(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    return decrypt(value)
  } catch {
    // If decryption fails, it might be unencrypted legacy data
    // Return as-is (but log this for monitoring)
    console.warn("[Crypto] Failed to decrypt value, returning as-is (possibly unencrypted legacy data)")
    return value
  }
}
