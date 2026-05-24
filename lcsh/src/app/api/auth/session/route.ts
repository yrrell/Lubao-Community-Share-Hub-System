// src/app/api/auth/session/route.ts
// Returns the current session user for client components that need role info.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  return NextResponse.json(session);
}
