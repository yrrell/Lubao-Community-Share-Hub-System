// src/app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const txId = parseInt(id);
  const body = await req.json();
  const { action, payment_ref, payment_screenshot } = body;

  // Fetch transaction + tool owner
  const txRes = await db.execute({
    sql: `SELECT t.*, tl.owner_id, tl.name AS tool_name, u.username AS borrower_username
          FROM transactions t
          JOIN tools tl ON tl.id = t.tool_id
          JOIN users u  ON u.id  = t.borrower_id
          WHERE t.id = ?`,
    args: [txId],
  });

  if (!txRes.rows.length) {
    return NextResponse.json({ status: "error", message: "Transaction not found." }, { status: 404 });
  }

  const tx = txRes.rows[0] as {
    owner_id: number; borrower_id: number; tool_name: string; borrower_username: string; status: string;
  };

  // Authorization: only lender or admin can approve/decline; only lender can mark returned
  const isLender = tx.owner_id === session.id;
  const isAdmin  = session.role === "admin";

  if (action === "approve") {
    if (!isLender && !isAdmin) return NextResponse.json({ status: "error", message: "Forbidden" }, { status: 403 });
    await db.execute({
      sql: "UPDATE transactions SET approval_status='approved', status='active', updated_at=datetime('now') WHERE id=?",
      args: [txId],
    });
    // Notify borrower
    await db.execute({
      sql: `INSERT INTO notifications (user_id, type, message, related_id, created_at)
            VALUES (?, 'success', 'Your request for "' || ? || '" was approved! Ready for pickup.', ?, datetime('now'))`,
      args: [tx.borrower_id, tx.tool_name, txId],
    });
  } else if (action === "decline") {
    if (!isLender && !isAdmin) return NextResponse.json({ status: "error", message: "Forbidden" }, { status: 403 });
    await db.execute({
      sql: "UPDATE transactions SET approval_status='declined', status='cancelled', updated_at=datetime('now') WHERE id=?",
      args: [txId],
    });
    await db.execute({
      sql: `INSERT INTO notifications (user_id, type, message, related_id, created_at)
            VALUES (?, 'danger', 'Your request for "' || ? || '" was declined.', ?, datetime('now'))`,
      args: [tx.borrower_id, tx.tool_name, txId],
    });
  } else if (action === "return") {
    if (!isLender && !isAdmin) return NextResponse.json({ status: "error", message: "Forbidden" }, { status: 403 });
    await db.execute({
      sql: "UPDATE transactions SET status='returned', updated_at=datetime('now') WHERE id=?",
      args: [txId],
    });
    // Make tool available again
    await db.execute({
      sql: `UPDATE tools SET status='available', borrow_count = borrow_count + 1
            WHERE id = (SELECT tool_id FROM transactions WHERE id = ?)`,
      args: [txId],
    });
    await db.execute({
      sql: `INSERT INTO notifications (user_id, type, message, related_id, created_at)
            VALUES (?, 'success', 'Your borrow of "' || ? || '" has been marked as returned. Thank you!', ?, datetime('now'))`,
      args: [tx.borrower_id, tx.tool_name, txId],
    });
  } else if (action === "payment") {
    // Borrower submits payment proof
    if (tx.borrower_id !== session.id) return NextResponse.json({ status: "error", message: "Forbidden" }, { status: 403 });
    await db.execute({
      sql: "UPDATE transactions SET payment_ref=?, payment_screenshot=?, updated_at=datetime('now') WHERE id=?",
      args: [payment_ref ?? null, payment_screenshot ?? null, txId],
    });
  } else {
    return NextResponse.json({ status: "error", message: "Unknown action." }, { status: 400 });
  }

  return NextResponse.json({ status: "success" });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const res = await db.execute({
    sql: `SELECT t.*, tl.name AS tool_name, tl.image_url AS tool_image, tl.description AS tool_desc,
            b.first_name||' '||b.last_name AS borrower_name, b.username AS borrower_username,
            b.full_address AS borrower_address, b.profile_pic AS borrower_pic,
            o.first_name||' '||o.last_name AS owner_name, o.username AS owner_username,
            o.phone_number AS owner_phone, o.profile_pic AS owner_pic
          FROM transactions t
          JOIN tools tl ON tl.id = t.tool_id
          JOIN users b  ON b.id  = t.borrower_id
          JOIN users o  ON o.id  = tl.owner_id
          WHERE t.id = ?`,
    args: [parseInt(id)],
  });

  if (!res.rows.length) return NextResponse.json({ status: "error", message: "Not found" }, { status: 404 });

  const tx = res.rows[0] as { borrower_id: number; owner_id?: number };
  if (session.role !== "admin" && tx.borrower_id !== session.id) {
    return NextResponse.json({ status: "error", message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ status: "success", data: res.rows[0] });
}
