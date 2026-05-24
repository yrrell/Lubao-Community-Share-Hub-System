// ============================================================
// src/lib/auth.shared.ts
// JWT helpers — NO next/headers import — safe in any context
// (client components, middleware, route handlers, server components)
// ============================================================
import { SignJWT, jwtVerify } from "jose";
import type { JwtPayload, SessionUser, UserRole } from "@/types";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-dev-secret-change-in-production"
);

export const COOKIE_NAME    = "lsh_token";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ── Sign a JWT ────────────────────────────────────────────────────────────────
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

// ── Verify a JWT ─────────────────────────────────────────────────────────────
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ── Build auth cookie options (used in login route handler) ───────────────────
export function buildAuthCookie(token: string) {
  return {
    name:     COOKIE_NAME,
    value:    token,
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge:   COOKIE_MAX_AGE,
    path:     "/",
  };
}

// ── Build clear cookie options (used in logout route handler) ─────────────────
export function buildClearCookie() {
  return {
    name:     COOKIE_NAME,
    value:    "",
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge:   0,
    path:     "/",
  };
}

// ── Role guard helper ─────────────────────────────────────────────────────────
export function requireRole(session: SessionUser | null, role: UserRole): boolean {
  return session?.role === role;
}

// ── Shape a JWT payload into a SessionUser ────────────────────────────────────
export function payloadToSession(payload: JwtPayload): SessionUser {
  return { id: payload.id, username: payload.username, role: payload.role };
}
