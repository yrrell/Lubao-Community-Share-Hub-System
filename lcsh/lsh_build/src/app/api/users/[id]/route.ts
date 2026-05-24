// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

// PATCH /api/users/[id]  – verify, suspend, warn a user (admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json() as { action: "verify" | "suspend" | "activate" | "warn" | "ban" };

    switch (body.action) {
      case "verify":
        await db.execute({ sql: "UPDATE users SET is_verified = 1 WHERE id = ?", args: [id] });
        break;
      case "suspend":
        await db.execute({ sql: "UPDATE users SET account_status = 'suspended' WHERE id = ?", args: [id] });
        break;
      case "activate":
        await db.execute({ sql: "UPDATE users SET account_status = 'active' WHERE id = ?", args: [id] });
        break;
      case "warn":
        await db.execute({ sql: "UPDATE users SET warning_count = warning_count + 1 WHERE id = ?", args: [id] });
        break;
      case "ban":
        await db.execute({ sql: "UPDATE users SET account_status = 'banned' WHERE id = ?", args: [id] });
        break;
      default:
        return NextResponse.json<ApiResponse>({ status: "error", message: "Invalid action." }, { status: 400 });
    }

    return NextResponse.json<ApiResponse>({ status: "success", message: `User ${body.action} successful.` });
  } catch (err) {
    console.error("[User PATCH]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}
