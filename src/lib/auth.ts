import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "vibe-session";
const ADMIN_USER_ID = "admin";
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Administrator";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "vibe-fallback-secret-key";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function validateCredentials(
  email: string,
  password: string
): Promise<SessionPayload | null> {
  if (
    email.toLowerCase() === ADMIN_EMAIL &&
    password === ADMIN_PASSWORD
  ) {
    return {
      userId: ADMIN_USER_ID,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
    };
  }
  return null;
}

export { SESSION_COOKIE, ADMIN_USER_ID };
