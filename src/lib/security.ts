/**
 * Security utilities for authentication and authorization
 */

import { createHmac } from "crypto"

// ============================================================================
// Base URL Utilities
// ============================================================================

/**
 * Gets the application base URL from environment variables
 * Handles operator precedence correctly to avoid common bugs
 */
export function getBaseUrl(): string {
  // NEXTAUTH_URL takes priority (explicitly configured)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  // VERCEL_URL is auto-set by Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  // Fallback for local development
  return "http://localhost:3000"
}

// ============================================================================
// Internal API Signature Verification
// ============================================================================

/**
 * Generates a signature for internal API calls
 * Prevents unauthorized access to internal endpoints
 */
export function generateInternalApiSignature(payload: string, timestamp: number): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error("AUTH_SECRET is required for internal API calls")
  }
  const data = `${payload}:${timestamp}`
  return createHmac("sha256", secret).update(data).digest("hex")
}

/**
 * Verifies a signature for internal API calls
 * Returns true if valid, false otherwise
 */
export function verifyInternalApiSignature(
  payload: string,
  timestamp: number,
  signature: string,
  maxAgeMs = 60000 // 1 minute
): boolean {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    return false
  }

  // Check timestamp is recent (prevent replay attacks)
  const now = Date.now()
  if (Math.abs(now - timestamp) > maxAgeMs) {
    return false
  }

  // Verify signature
  const expectedSignature = generateInternalApiSignature(payload, timestamp)

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i)
  }
  return result === 0
}

// ============================================================================
// Callback URL Validation
// ============================================================================

// Allowed callback URL hosts (same-origin by default)
const ALLOWED_CALLBACK_HOSTS = new Set<string>([
  // Add additional allowed hosts here if needed
  // "trusted-partner.com",
])

/**
 * Validates that a callback URL is safe (same-origin or whitelisted)
 * Prevents open redirect vulnerabilities
 */
export function isValidCallbackUrl(url: string, baseUrl: string): boolean {
  // Empty or relative paths starting with / are safe
  if (!url || url.startsWith("/")) {
    // Prevent protocol-relative URLs like //evil.com
    if (url.startsWith("//")) {
      return false
    }
    return true
  }

  try {
    const callbackUrlObj = new URL(url)
    const baseUrlObj = new URL(baseUrl)

    // Same origin is always allowed
    if (callbackUrlObj.origin === baseUrlObj.origin) {
      return true
    }

    // Check against whitelist
    if (ALLOWED_CALLBACK_HOSTS.has(callbackUrlObj.host)) {
      return true
    }

    return false
  } catch {
    // Invalid URL format - reject
    return false
  }
}

/**
 * Sanitizes a callback URL, returning a safe default if invalid
 */
export function sanitizeCallbackUrl(url: string | null | undefined, baseUrl: string, defaultPath = "/tasks"): string {
  if (!url) {
    return defaultPath
  }

  if (isValidCallbackUrl(url, baseUrl)) {
    // For relative paths, return as-is
    if (url.startsWith("/") && !url.startsWith("//")) {
      return url
    }
    // For absolute URLs that passed validation, return the pathname
    try {
      const urlObj = new URL(url)
      return urlObj.pathname + urlObj.search
    } catch {
      return defaultPath
    }
  }

  return defaultPath
}

// ============================================================================
// Rate Limiting
// ============================================================================
//
// WARNING: This implementation uses in-memory storage and is only effective
// for SINGLE-INSTANCE deployments. For multi-instance or serverless deployments,
// replace with Redis or another distributed store.
//
// Limitations:
// - State is lost on server restart
// - Not shared across multiple instances
// - Not suitable for Vercel serverless (each function invocation is isolated)
//
// For production multi-instance deployments, consider:
// - Redis with @upstash/ratelimit
// - Vercel Edge Config
// - External rate limiting service (Cloudflare, etc.)
// ============================================================================

interface RateLimitEntry {
  count: number
  firstAttempt: number
  blockedUntil: number
}

// In-memory store - SINGLE INSTANCE ONLY
const loginAttempts = new Map<string, RateLimitEntry>()

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,           // Max failed attempts before blocking
  windowMs: 15 * 60 * 1000, // 15 minute window
  blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes after exceeding limit
}

/**
 * Checks if a login attempt should be rate limited
 * Returns remaining attempts or 0 if blocked
 */
export function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number; retryAfterMs?: number } {
  const now = Date.now()
  const entry = loginAttempts.get(identifier)

  // No previous attempts
  if (!entry) {
    return { allowed: true, remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts }
  }

  // Currently blocked
  if (entry.blockedUntil > now) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterMs: entry.blockedUntil - now
    }
  }

  // Window expired, reset
  if (now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    loginAttempts.delete(identifier)
    return { allowed: true, remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts }
  }

  const remaining = RATE_LIMIT_CONFIG.maxAttempts - entry.count
  return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining) }
}

/**
 * Records a failed login attempt
 */
export function recordFailedAttempt(identifier: string): void {
  const now = Date.now()
  const entry = loginAttempts.get(identifier)

  if (!entry || now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    // Start new window
    loginAttempts.set(identifier, {
      count: 1,
      firstAttempt: now,
      blockedUntil: 0,
    })
    return
  }

  entry.count++

  // Block if exceeded
  if (entry.count >= RATE_LIMIT_CONFIG.maxAttempts) {
    entry.blockedUntil = now + RATE_LIMIT_CONFIG.blockDurationMs
  }

  loginAttempts.set(identifier, entry)
}

/**
 * Clears rate limit on successful login
 */
export function clearRateLimit(identifier: string): void {
  loginAttempts.delete(identifier)
}

// Cleanup old entries periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of loginAttempts.entries()) {
      if (now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs && entry.blockedUntil < now) {
        loginAttempts.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}
