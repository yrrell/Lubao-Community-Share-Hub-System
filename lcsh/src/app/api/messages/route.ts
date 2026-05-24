// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { ApiResponse, Message } from "@/types";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const withUser = searchParams.get("with");

  if (!withUser) {
    // List all chat partners
    const res = await db.execute({
      sql: `SELECT DISTINCT
              CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS partner_id,
              u.username AS partner_username, u.profile_pic AS partner_pic,
              MAX(m.created_at) AS last_message_at
            FROM messages m
            JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
            WHERE m.sender_id = ? OR m.receiver_id = ?
            GROUP BY partner_id ORDER BY last_message_at DESC`,
      args: [session.id, session.id, session.id, session.id],
    });
    return NextResponse.json<ApiResponse>({ status: "success", data: res.rows });
  }

  // Get messages with a specific user
  const res = await db.execute({
    sql: `SELECT m.*, u.username AS sender_username, u.profile_pic AS sender_pic
          FROM messages m JOIN users u ON m.sender_id = u.id
          WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
          ORDER BY m.created_at ASC LIMIT 100`,
    args: [session.id, withUser, withUser, session.id],
  });

  // Mark as read
  await db.execute({
    sql: "UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?",
    args: [withUser, session.id],
  });

  return NextResponse.json<ApiResponse<Message[]>>({ status: "success", data: res.rows as unknown as Message[] });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });

  const body = await req.json() as { receiver_id: number; content: string };
  if (!body.receiver_id || !body.content?.trim()) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "receiver_id and content required." }, { status: 400 });
  }

  await db.execute({
    sql: "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?,?,?)",
    args: [session.id, body.receiver_id, body.content.trim()],
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "Message sent." });
}
