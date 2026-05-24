// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";
  const sql = unreadOnly
    ? "SELECT * FROM notifications WHERE user_id=? AND is_read=0 ORDER BY created_at DESC LIMIT 20"
    : "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50";

  const res = await db.execute({ sql, args: [session.id] });
  return NextResponse.json({ status: "success", data: res.rows });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (id) {
    await db.execute({ sql: "UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?", args: [id, session.id] });
  } else {
    await db.execute({ sql: "UPDATE notifications SET is_read=1 WHERE user_id=?", args: [session.id] });
  }
  return NextResponse.json({ status: "success" });
}
