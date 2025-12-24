import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { env } from "@/env"

export async function POST(request: Request) {
  try {
    // Verify auth
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const secret = new TextEncoder().encode(env.JWT_SECRET)

    let userId: string
    try {
      const { payload } = await jwtVerify(token, secret)
      userId = payload.userId as string
      if (!userId) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: "Token verification failed" }, { status: 401 })
    }

    // Parse request body
    const { type, content } = await request.json()

    if (!type || !content) {
      return NextResponse.json({ error: "Missing type or content" }, { status: 400 })
    }

    // Forward to n8n webhook
    const webhookUrl = env.N8N_REVERSE_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: "Reverse webhook not configured" }, { status: 503 })
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        type,
        content: content.trim(),
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("n8n webhook error:", response.status, text)
      return NextResponse.json({ error: "Webhook failed" }, { status: 502 })
    }

    const data = await response.json().catch(() => ({}))
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Reverse API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
