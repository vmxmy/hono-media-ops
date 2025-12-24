import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { SignJWT } from "jose";
import { env } from "@/env";

export async function POST(request: Request) {
  try {
    const { username, accessCode } = await request.json();

    if (!username || !accessCode) {
      return NextResponse.json(
        { error: "Username and access code are required" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), eq(users.accessCode, accessCode)))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or access code" },
        { status: 401 }
      );
    }

    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const token = await new SignJWT({ userId: user.id, username: user.username })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);

    return NextResponse.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
