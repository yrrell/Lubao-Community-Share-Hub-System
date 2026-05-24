// src/app/api/messages/route.ts
// FIXED: `content` → `body`  (schema column name is `body`)
//        `transaction_id` → `borrow_id`
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { ApiResponse, Message } from "@/types";

// GET /api/messages
// ?with=<user_id>  → conversation thread
// (no param)       → list all chat partners
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const withUser = searchParams.get("with");

  if (!withUser) {
    // List distinct chat partners with latest message time
    const res = await db.execute({
      sql: `
        SELECT
          CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS partner_id,
          u.username  AS partner_username,
          u.profile_pic AS partner_pic,
          MAX(m.created_at) AS last_message_at,
          SUM(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 ELSE 0 END) AS unread_count
        FROM messages m
        JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
        WHERE m.sender_id = ? OR m.receiver_id = ?
        GROUP BY partner_id
        ORDER BY last_message_at DESC
      `,
      args: [session.id, session.id, session.id, session.id, session.id],
    });
    return NextResponse.json<ApiResponse>({ status: "success", data: res.rows });
  }

  // Fetch conversation with a specific user
  const res = await db.execute({
    sql: `
      SELECT m.*, u.username AS sender_username, u.profile_pic AS sender_pic
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
      LIMIT 200
    `,
    args: [session.id, withUser, withUser, session.id],
  });

  // Mark received messages as read
  await db.execute({
    sql:  "UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?",
    args: [withUser, session.id],
  });

  return NextResponse.json<ApiResponse<Message[]>>({
    status: "success",
    data:   res.rows as unknown as Message[],
  });
}

// POST /api/messages
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });
  }

  const reqBody = await req.json() as {
    receiver_id: number;
    body:        string;
    borrow_id?:  number | null;
  };

  if (!reqBody.receiver_id || !reqBody.body?.trim()) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "receiver_id and body are required." },
      { status: 400 },
    );
  }

  await db.execute({
    sql:  "INSERT INTO messages (sender_id, receiver_id, body, borrow_id) VALUES (?, ?, ?, ?)",
    args: [session.id, reqBody.receiver_id, reqBody.body.trim(), reqBody.borrow_id ?? null],
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "Message sent." });
}
