// ============================================================
// src/middleware.ts
// FIX: Now imports verifyToken from auth.shared (not auth.ts)
//      which previously caused "next/headers only works in a
//      Server Component" errors since middleware runs in the
//      Edge runtime where next/headers is not available.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth.shared";  // ← FIX: was @/lib/auth

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/about",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/_next",
  "/favicon.ico",
  "/assets",
  "/uploads",
];

const ADMIN_PATHS = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token   = request.cookies.get("lsh_token")?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (ADMIN_PATHS.some((p) => pathname.startsWith(p)) && payload.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    payload.role === "admin"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/|uploads/).*)" ],
};
