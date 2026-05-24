// src/middleware.ts  (UPDATED — replaces existing)
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC = [
  "/login", "/register",
  "/api/auth/login", "/api/auth/register",
  "/_next", "/favicon.ico", "/assets", "/uploads",
];
const ADMIN_PREFIX = "/admin";
const USER_PREFIXES = ["/dashboard", "/tools", "/chat", "/notifications", "/my-requests", "/profile", "/report", "/agreement"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token   = request.cookies.get("lsh_token")?.value;
  const payload = token ? await verifyToken(token) : null;

  // No session → login
  if (!payload) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Admin trying to access user routes → redirect to admin dashboard
  if (payload.role === "admin" && USER_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  // Non-admin trying to access admin routes → redirect to user dashboard
  if (pathname.startsWith(ADMIN_PREFIX) && payload.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Attach user info to headers for downstream use
  const res = NextResponse.next();
  res.headers.set("x-user-id",   String(payload.id));
  res.headers.set("x-user-role", payload.role);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/|uploads/).*)"],
};
