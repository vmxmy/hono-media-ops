import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
  // NextAuth v5 uses AUTH_SECRET, fallback to NEXTAUTH_SECRET for compatibility
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  const token = await getToken({ req, secret })
  if (token) return NextResponse.next()

  const loginUrl = new URL("/login", req.url)
  loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/tasks/:path*", "/prompts/:path*", "/reverse/:path*", "/insights/:path*", "/profile/:path*", "/articles/:path*"],
}
