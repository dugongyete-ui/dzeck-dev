import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { RateLimiterPrisma } from "rate-limiter-flexible";
import { createSession, validateCredentials, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";

const loginRateLimiter = new RateLimiterPrisma({
  storeClient: prisma,
  tableName: "Usage",
  keyPrefix: "login",
  points: 5,
  duration: 60,
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  try {
    await loginRateLimiter.consume(ip);
  } catch {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again in a minute." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const session = await validateCredentials(email, password);

    if (!session) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createSession(session);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({ success: true, user: session });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
