// src/middleware.ts
// FIX: Added /about to PUBLIC_PATHS so unauthenticated visitors can view it.
//      Added /api/auth/logout to public paths to prevent redirect loops on logout.
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/about",                  // FIX: allow unauthenticated access to About page
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",        // FIX: allow logout without valid session
  "/_next",
  "/favicon.ico",
  "/assets",
  "/uploads",
];

const ADMIN_PATHS = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass public paths through immediately
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token   = request.cookies.get("lsh_token")?.value;
  const payload = token ? await verifyToken(token) : null;

  // No valid session → redirect to login
  if (!payload) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Non-admin trying to access admin routes → redirect to user dashboard
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p)) && payload.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Admin trying to access user pages → redirect to admin dashboard
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/|uploads/).*)"],
};
