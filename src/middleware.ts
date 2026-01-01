import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Cache for user status checks (TTL: 60 seconds)
// This reduces database load while still catching disabled users within a minute
const userStatusCache = new Map<string, { active: boolean; timestamp: number }>()
const CACHE_TTL_MS = 60 * 1000

// Security policy: fail-open (default) vs fail-closed
// Set USER_STATUS_CHECK_FAIL_CLOSED=true for stricter security
const FAIL_CLOSED = process.env.USER_STATUS_CHECK_FAIL_CLOSED === "true"

/**
 * Gets the application base URL from environment variables
 * Note: Duplicated from security.ts because middleware runs in Edge Runtime
 * and cannot import Node.js crypto module
 */
function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

/**
 * Generates HMAC signature using Web Crypto API (Edge compatible)
 */
async function generateSignature(payload: string, timestamp: number): Promise<string> {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error("AUTH_SECRET is required")
  }

  const data = `${payload}:${timestamp}`
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(data)

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign("HMAC", key, messageData)
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

async function isUserActive(userId: string): Promise<boolean> {
  const now = Date.now()
  const cached = userStatusCache.get(userId)

  // Return cached result if still valid
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.active
  }

  try {
    const baseUrl = getBaseUrl()
    const timestamp = Date.now()
    const signature = await generateSignature(userId, timestamp)

    const response = await fetch(`${baseUrl}/api/auth/check-user?userId=${encodeURIComponent(userId)}`, {
      headers: {
        "x-internal-timestamp": String(timestamp),
        "x-internal-signature": signature,
      },
    })

    if (!response.ok) {
      // Log warning for monitoring
      console.warn(`[Security] User status check failed for ${userId}: HTTP ${response.status}. Policy: ${FAIL_CLOSED ? "fail-closed" : "fail-open"}`)
      // Apply configured security policy
      return !FAIL_CLOSED
    }

    const data = await response.json() as { active: boolean }
    userStatusCache.set(userId, { active: data.active, timestamp: now })
    return data.active
  } catch (error) {
    // Log warning for monitoring
    console.warn(`[Security] User status check error for ${userId}: ${error instanceof Error ? error.message : "Unknown error"}. Policy: ${FAIL_CLOSED ? "fail-closed" : "fail-open"}`)
    // Apply configured security policy
    return !FAIL_CLOSED
  }
}

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET })

  if (!token) {
    const loginUrl = new URL("/login", req.url)
    // Only include safe relative path in callback
    const callbackPath = req.nextUrl.pathname + req.nextUrl.search
    loginUrl.searchParams.set("callbackUrl", callbackPath)
    return NextResponse.redirect(loginUrl)
  }

  // Validate user is still active (not deleted/disabled)
  const userId = token.id as string
  if (userId) {
    const isActive = await isUserActive(userId)
    if (!isActive) {
      // User has been disabled/deleted - clear their session
      const response = NextResponse.redirect(new URL("/login?error=AccountDisabled", req.url))
      // Clear the session cookie
      response.cookies.delete("next-auth.session-token")
      response.cookies.delete("__Secure-next-auth.session-token")
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/tasks/:path*", "/prompts/:path*", "/reverse/:path*", "/insights/:path*", "/profile/:path*", "/articles/:path*"],
}
