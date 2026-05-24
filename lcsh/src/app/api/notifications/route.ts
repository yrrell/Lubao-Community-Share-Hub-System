// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { ApiResponse, Notification } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });

  const isAdmin = session.role === "admin";
  const res = await db.execute({
    sql: isAdmin
      ? "SELECT * FROM notifications WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 50"
      : "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    args: isAdmin ? [] : [session.id],
  });
  return NextResponse.json<ApiResponse<Notification[]>>({ status: "success", data: res.rows as unknown as Notification[] });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });

  const body = await req.json() as { id?: number; markAll?: boolean };

  if (body.markAll) {
    const isAdmin = session.role === "admin";
    await db.execute({
      sql: isAdmin
        ? "UPDATE notifications SET is_read = 1 WHERE user_id IS NULL"
        : "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
      args: isAdmin ? [] : [session.id],
    });
  } else if (body.id) {
    await db.execute({ sql: "UPDATE notifications SET is_read = 1 WHERE id = ?", args: [body.id] });
  }

  return NextResponse.json<ApiResponse>({ status: "success" });
}
