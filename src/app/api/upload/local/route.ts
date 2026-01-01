/**
 * Local Upload API Route
 *
 * Handles file uploads for local storage provider.
 * Verifies signed tokens and saves files to the local filesystem.
 */

import { NextRequest, NextResponse } from "next/server"
import { LocalProvider } from "@/lib/storage/local-provider"
import { env } from "@/env"

export async function POST(request: NextRequest) {
  try {
    // Get the token from query string
    const token = request.nextUrl.searchParams.get("token")
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }

    // Verify the token
    const payload = LocalProvider.verifyUploadToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    // Get the file from form data
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Verify content type matches
    if (file.type !== payload.contentType) {
      return NextResponse.json(
        { error: `Content type mismatch: expected ${payload.contentType}, got ${file.type}` },
        { status: 400 }
      )
    }

    // Create local provider and save file
    const provider = new LocalProvider({
      uploadDir: env.LOCAL_UPLOAD_DIR,
      publicPath: env.LOCAL_PUBLIC_PATH,
    })

    const buffer = Buffer.from(await file.arrayBuffer())
    await provider.saveFile(payload.key, buffer)

    return NextResponse.json({
      success: true,
      key: payload.key,
      publicUrl: provider.getPublicUrl(payload.key),
    })
  } catch (error) {
    console.error("Local upload error:", error)
    return NextResponse.json(
      { error: "Upload failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
