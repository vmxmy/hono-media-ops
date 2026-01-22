import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from "@/server/db"
import { users } from "@/server/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { verifyInternalApiSignature } from "@/lib/security"

/**
 * Internal API to check if a user is still active
 * Used by middleware to validate JWT sessions
 *
 * Security: This endpoint is protected by HMAC signature verification
 * to prevent external user enumeration attacks
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  // Verify signature from middleware
  const timestampStr = request.headers.get("x-internal-timestamp")
  const signature = request.headers.get("x-internal-signature")

  if (!timestampStr || !signature) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp)) {
    return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 })
  }

  // Verify the signature using AUTH_SECRET
  const isValid = verifyInternalApiSignature(userId, timestamp, signature)
  if (!isValid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          isNull(users.deletedAt)
        )
      )
      .limit(1)

    return NextResponse.json({ active: !!user })
  } catch {
    // On database error, return active to avoid locking out users
    return NextResponse.json({ active: true })
  }
}
