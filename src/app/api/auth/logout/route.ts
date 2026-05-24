// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { buildClearCookie } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST() {
  const response = NextResponse.json<ApiResponse>({ status: "success", message: "Logged out." });
  response.cookies.set(buildClearCookie());
  return response;
}
