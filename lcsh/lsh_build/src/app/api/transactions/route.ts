// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const role = req.nextUrl.searchParams.get("role"); // "lender" | "borrower"

  let sql: string;
  let args: (string | number)[];

  if (session.role === "admin") {
    sql = `SELECT t.*, tl.name AS tool_name, tl.image_url AS tool_image,
             u.first_name||' '||u.last_name AS borrower_name, u.username AS borrower_username
           FROM transactions t
           JOIN tools tl ON tl.id = t.tool_id
           JOIN users u  ON u.id  = t.borrower_id
           ORDER BY t.created_at DESC LIMIT 100`;
    args = [];
  } else if (role === "lender") {
    sql = `SELECT t.*, tl.name AS tool_name, tl.image_url AS tool_image,
             u.first_name||' '||u.last_name AS borrower_name, u.username AS borrower_username
           FROM transactions t
           JOIN tools tl ON tl.id = t.tool_id
           JOIN users u  ON u.id  = t.borrower_id
           WHERE tl.owner_id = ?
           ORDER BY t.created_at DESC`;
    args = [session.id];
  } else {
    sql = `SELECT t.*, tl.name AS tool_name, tl.image_url AS tool_image,
             own.first_name||' '||own.last_name AS owner_name, own.username AS owner_username
           FROM transactions t
           JOIN tools tl ON tl.id = t.tool_id
           JOIN users own ON own.id = tl.owner_id
           WHERE t.borrower_id = ?
           ORDER BY t.created_at DESC`;
    args = [session.id];
  }

  const res = await db.execute({ sql, args });
  return NextResponse.json({ status: "success", data: res.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tool_id, payment_method = "free", payment_ref, borrow_date, due_date } = body;

  if (!tool_id) return NextResponse.json({ status: "error", message: "tool_id is required" }, { status: 400 });

  // Check tool exists and is available
  const toolRes = await db.execute({ sql: "SELECT * FROM tools WHERE id=? AND status='available' AND approval_status='approved'", args: [tool_id] });
  if (!toolRes.rows.length) {
    return NextResponse.json({ status: "error", message: "Tool is not available for borrowing." }, { status: 409 });
  }

  const tool = toolRes.rows[0] as { owner_id: number; name: string };

  // Prevent self-borrow
  if (tool.owner_id === session.id) {
    return NextResponse.json({ status: "error", message: "You cannot borrow your own tool." }, { status: 400 });
  }

  const result = await db.execute({
    sql: `INSERT INTO transactions (tool_id, borrower_id, status, approval_status, payment_method, payment_ref, created_at, updated_at)
          VALUES (?,?,'pending','pending',?,?,datetime('now'),datetime('now')) RETURNING *`,
    args: [tool_id, session.id, payment_method, payment_ref ?? null],
  });

  // Notify the tool owner
  await db.execute({
    sql: `INSERT INTO notifications (user_id, type, message, related_id, created_at)
          VALUES (?, 'borrow_request', 'New borrow request for your tool: ' || ?, ?, datetime('now'))`,
    args: [tool.owner_id, tool.name, result.rows[0].id as number],
  });

  return NextResponse.json({ status: "success", data: result.rows[0] }, { status: 201 });
}
