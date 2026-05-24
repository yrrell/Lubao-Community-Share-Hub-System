// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const withId = req.nextUrl.searchParams.get("with");
  if (!withId) return NextResponse.json({ status: "error", message: "Missing partner id" }, { status: 400 });

  const partnerId = parseInt(withId);
  const msgsRes = await db.execute({
    sql: `SELECT * FROM messages
          WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)
          ORDER BY created_at ASC LIMIT 100`,
    args: [session.id, partnerId, partnerId, session.id],
  });

  // Mark received messages as read
  await db.execute({
    sql: "UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=?",
    args: [partnerId, session.id],
  });

  return NextResponse.json({ status: "success", data: msgsRes.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const { receiver_id, body } = await req.json();
  if (!receiver_id || !body?.trim()) {
    return NextResponse.json({ status: "error", message: "receiver_id and body are required" }, { status: 400 });
  }

  const result = await db.execute({
    sql: "INSERT INTO messages (sender_id, receiver_id, body, created_at) VALUES (?,?,?,datetime('now')) RETURNING *",
    args: [session.id, receiver_id, body.trim()],
  });

  // Create notification for receiver
  await db.execute({
    sql: `INSERT INTO notifications (user_id, type, message, related_id, created_at)
          VALUES (?, 'info', 'New message from @' || ?, ?, datetime('now'))`,
    args: [receiver_id, session.username, session.id],
  });

  return NextResponse.json({ status: "success", data: result.rows[0] });
}
