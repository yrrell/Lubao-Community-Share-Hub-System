// src/app/api/notifications/route.ts
// FIXED: Admin query no longer uses `WHERE user_id IS NULL`
//        (user_id is NOT NULL in schema — admins have a real user row with role='admin').
//        Admin now sees ALL notifications across all users (most useful for moderation).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { ApiResponse, Notification } from "@/types";

// GET /api/notifications
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = session.role === "admin";

  const res = await db.execute({
    sql: isAdmin
      // Admin sees all system + user notifications, most recent first
      ? `SELECT n.*, u.username AS recipient_username
         FROM notifications n
         LEFT JOIN users u ON n.user_id = u.id
         ORDER BY n.created_at DESC
         LIMIT 100`
      : `SELECT * FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 50`,
    args: isAdmin ? [] : [session.id],
  });

  return NextResponse.json<ApiResponse<Notification[]>>({
    status: "success",
    data:   res.rows as unknown as Notification[],
  });
}

// PATCH /api/notifications  – mark as read
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json() as { id?: number; markAll?: boolean };

  if (body.markAll) {
    await db.execute({
      sql:  "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
      args: [session.id],
    });
  } else if (body.id) {
    // Make sure the user owns this notification (or is admin)
    await db.execute({
      sql: session.role === "admin"
        ? "UPDATE notifications SET is_read = 1 WHERE id = ?"
        : "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      args: session.role === "admin"
        ? [body.id]
        : [body.id, session.id],
    });
  }

  return NextResponse.json<ApiResponse>({ status: "success" });
}
