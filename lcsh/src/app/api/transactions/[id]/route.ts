// src/app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail, emailBorrowApproved, emailBorrowDeclined } from "@/lib/email";
import type { ApiResponse } from "@/types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });

  try {
    const body = await req.json() as { action: "approve" | "declined"; confirm_ref?: string };
    const { action, confirm_ref } = body;

    // Fetch transaction with tool + borrower info
    const res = await db.execute({
      sql: `SELECT tx.*, t.name AS tool_name, t.id AS tool_id, t.owner_id,
                   u.email, u.first_name, u.id AS borrower_id
            FROM transactions tx
            JOIN tools t ON tx.tool_id = t.id
            JOIN users u ON tx.borrower_id = u.id
            WHERE tx.id = ?`,
      args: [id],
    });

    if (!res.rows.length) return NextResponse.json<ApiResponse>({ status: "error", message: "Transaction not found." }, { status: 404 });
    const tx = res.rows[0];

    // Only tool owner or admin can act
    const isOwner = Number(tx.owner_id) === session.id;
    const isAdmin = session.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Forbidden." }, { status: 403 });
    }

    if (action === "approve") {
      // Anti-scam: GCash reference ID must match
      if (tx.payment_method === "gcash") {
        if (!confirm_ref || confirm_ref !== tx.payment_ref) {
          return NextResponse.json<ApiResponse>({ status: "error", message: "GCash reference ID mismatch! Approval denied." }, { status: 400 });
        }
      }

      await db.execute({ sql: "UPDATE transactions SET approval_status = 'approved', updated_at = datetime('now') WHERE id = ?", args: [id] });
      await db.execute({ sql: "UPDATE tools SET status = 'borrowed' WHERE id = ?", args: [tx.tool_id] });

      // Email + notification
      sendEmail({ to: tx.email as string, subject: "Borrow Request Approved!", html: emailBorrowApproved(tx.first_name as string, tx.tool_name as string, Number(id)) }).catch(console.error);
      await db.execute({
        sql: `INSERT INTO notifications (user_id, message, type, related_id) VALUES (?,?,'success',?)`,
        args: [tx.borrower_id, `Your request for "${tx.tool_name}" was approved!`, id],
      });

      return NextResponse.json<ApiResponse>({ status: "success", message: "Transaction approved." });
    }

    if (action === "declined") {
      await db.execute({ sql: "UPDATE transactions SET approval_status = 'declined', updated_at = datetime('now') WHERE id = ?", args: [id] });

      sendEmail({ to: tx.email as string, subject: "Borrow Request Update", html: emailBorrowDeclined(tx.first_name as string, tx.tool_name as string) }).catch(console.error);
      await db.execute({
        sql: `INSERT INTO notifications (user_id, message, type, related_id) VALUES (?,?,'danger',?)`,
        args: [tx.borrower_id, `Your request for "${tx.tool_name}" was declined.`, id],
      });

      return NextResponse.json<ApiResponse>({ status: "success", message: "Transaction declined." });
    }

    return NextResponse.json<ApiResponse>({ status: "error", message: "Invalid action." }, { status: 400 });
  } catch (err) {
    console.error("[Transaction PATCH]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}
