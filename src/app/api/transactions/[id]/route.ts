// src/app/api/transactions/[id]/route.ts
// FIXED: `transactions` → `borrows`, `tools` → `items`
//        approval_status → borrows.status  ('approved' | 'cancelled')
//        UPDATE tools SET status='borrowed' → UPDATE items SET is_available=0
//        Notification INSERT uses correct schema columns: (user_id, type, title, body, link)
//        GCash ref check uses payment_ref from borrows row
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail, emailBorrowApproved, emailBorrowDeclined } from "@/lib/email";
import type { ApiResponse } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id }  = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    const body = await req.json() as {
      action: "approve" | "declined" | "cancel" | "return";
      confirm_ref?: string;
    };
    const { action, confirm_ref } = body;

    // Fetch borrow with item + borrower info
    const res = await db.execute({
      sql: `
        SELECT b.*,
               i.title AS item_title, i.id AS item_id, i.owner_id,
               u.email, u.first_name, u.id AS borrower_id
        FROM borrows b
        JOIN items i ON b.item_id = i.id
        JOIN users u ON b.borrower_id = u.id
        WHERE b.id = ?
      `,
      args: [id],
    });

    if (!res.rows.length) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Borrow request not found." },
        { status: 404 },
      );
    }

    const borrow  = res.rows[0];
    const isOwner = Number(borrow.owner_id) === session.id;
    const isAdmin = session.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Forbidden." },
        { status: 403 },
      );
    }

    // ── APPROVE ──────────────────────────────────────────────────────────────
    if (action === "approve") {
      // Anti-scam: GCash reference must match
      if (borrow.payment_method === "gcash" && borrow.payment_ref) {
        if (!confirm_ref || confirm_ref !== borrow.payment_ref) {
          return NextResponse.json<ApiResponse>(
            { status: "error", message: "GCash reference ID mismatch! Approval denied." },
            { status: 400 },
          );
        }
      }

      await db.execute({
        sql:  "UPDATE borrows SET status = 'approved', updated_at = datetime('now') WHERE id = ?",
        args: [id],
      });
      // Mark item as unavailable
      await db.execute({
        sql:  "UPDATE items SET is_available = 0 WHERE id = ?",
        args: [borrow.item_id],
      });

      sendEmail({
        to:      borrow.email as string,
        subject: "Borrow Request Approved!",
        html:    emailBorrowApproved(borrow.first_name as string, borrow.item_title as string, Number(id)),
      }).catch(console.error);

      await db.execute({
        sql:  `INSERT INTO notifications (user_id, type, title, body, link)
               VALUES (?, 'approval', 'Borrow Request Approved', ?, ?)`,
        args: [
          borrow.borrower_id,
          `Your request for "${borrow.item_title}" was approved!`,
          `/my-requests?borrow_id=${id}`,
        ],
      });

      return NextResponse.json<ApiResponse>({ status: "success", message: "Borrow approved." });
    }

    // ── DECLINE ───────────────────────────────────────────────────────────────
    if (action === "declined") {
      await db.execute({
        sql:  "UPDATE borrows SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?",
        args: [id],
      });

      sendEmail({
        to:      borrow.email as string,
        subject: "Borrow Request Update",
        html:    emailBorrowDeclined(borrow.first_name as string, borrow.item_title as string),
      }).catch(console.error);

      await db.execute({
        sql:  `INSERT INTO notifications (user_id, type, title, body, link)
               VALUES (?, 'cancellation', 'Borrow Request Declined', ?, ?)`,
        args: [
          borrow.borrower_id,
          `Your request for "${borrow.item_title}" was declined.`,
          `/my-requests?borrow_id=${id}`,
        ],
      });

      return NextResponse.json<ApiResponse>({ status: "success", message: "Borrow declined." });
    }

    // ── MARK RETURNED ────────────────────────────────────────────────────────
    if (action === "return") {
      await db.execute({
        sql:  `UPDATE borrows
               SET status = 'returned', return_date = date('now'),
                   updated_at = datetime('now')
               WHERE id = ?`,
        args: [id],
      });
      // Re-enable item availability
      await db.execute({
        sql:  "UPDATE items SET is_available = 1, borrow_count = borrow_count + 1 WHERE id = ?",
        args: [borrow.item_id],
      });

      await db.execute({
        sql:  `INSERT INTO notifications (user_id, type, title, body, link)
               VALUES (?, 'return', 'Item Returned', ?, ?)`,
        args: [
          borrow.owner_id,
          `@${session.username} has returned "${borrow.item_title}".`,
          `/my-items?borrow_id=${id}`,
        ],
      });

      return NextResponse.json<ApiResponse>({ status: "success", message: "Marked as returned." });
    }

    // ── CANCEL ────────────────────────────────────────────────────────────────
    if (action === "cancel") {
      // Only borrower can cancel their own pending request
      if (Number(borrow.borrower_id) !== session.id && !isAdmin) {
        return NextResponse.json<ApiResponse>({ status: "error", message: "Forbidden." }, { status: 403 });
      }

      await db.execute({
        sql:  "UPDATE borrows SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?",
        args: [id],
      });

      // If item was already marked unavailable (approved state), restore it
      if (borrow.status === "approved" || borrow.status === "active") {
        await db.execute({
          sql:  "UPDATE items SET is_available = 1 WHERE id = ?",
          args: [borrow.item_id],
        });
      }

      return NextResponse.json<ApiResponse>({ status: "success", message: "Borrow cancelled." });
    }

    return NextResponse.json<ApiResponse>(
      { status: "error", message: "Invalid action." },
      { status: 400 },
    );
  } catch (err) {
    console.error("[Borrow PATCH]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}
