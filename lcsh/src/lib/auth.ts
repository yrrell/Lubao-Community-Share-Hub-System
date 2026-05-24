// ============================================================
// src/lib/auth.ts  –  JWT helpers + session utilities
// ============================================================
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { JwtPayload, SessionUser, UserRole } from "@/types";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-dev-secret-change-in-production"
);

const COOKIE_NAME = "lsh_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ---- Sign a JWT ----
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

// ---- Verify a JWT ----
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ---- Get current session from cookie (Server Component / Route Handler) ----
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return { id: payload.id, username: payload.username, role: payload.role };
}

// ---- Set auth cookie (used in login route handlers) ----
export function buildAuthCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

// ---- Clear auth cookie (used in logout route handler) ----
export function buildClearCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
}

// ---- Role guard helper ----
export function requireRole(session: SessionUser | null, role: UserRole): boolean {
  return session?.role === role;
}
