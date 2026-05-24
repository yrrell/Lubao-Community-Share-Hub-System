// ============================================================
// src/lib/auth.server.ts
// Server-only auth — uses next/headers (cookies).
// Import ONLY in: Route Handlers and Server Components.
// NEVER import in: 'use client' components or middleware.ts
//
// FIX: Splitting auth.ts into auth.shared.ts + auth.server.ts resolves the
//      "next/headers only works in a Server Component" compilation error
//      that occurred because auth.ts was imported in client-side pages.
// ============================================================

import { cookies } from "next/headers";
import {
  verifyToken,
  payloadToSession,
  COOKIE_NAME,
} from "@/lib/auth.shared";
import type { SessionUser } from "@/types";

// Re-export shared helpers so route handlers only need one import
export {
  signToken,
  verifyToken,
  buildAuthCookie,
  buildClearCookie,
  requireRole,
  payloadToSession,
} from "@/lib/auth.shared";

// ── Get current session from cookie (Route Handler / Server Component) ────────
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token       = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return payloadToSession(payload);
}
