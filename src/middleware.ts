import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "vibe-session";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "vibe-fallback-secret-key";
  return new TextEncoder().encode(secret);
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

const AUTH_ROUTES = ["/sign-in", "/sign-up"];

const PROTECTED_PREFIXES = ["/projects"];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  const authed = await isAuthenticated(req);

  if (AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    if (authed) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!authed) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
