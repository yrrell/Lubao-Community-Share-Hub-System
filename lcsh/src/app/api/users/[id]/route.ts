// src/app/api/users/[id]/route.ts
// FIXED: removed warning_count (not in real schema).
//        Notification INSERT now uses real schema columns: user_id, type, title, body.
//        Emails sent on verify/suspend/ban actions.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail, emailAccountApproved, emailAccountSuspended } from "@/lib/email";
import type { ApiResponse } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "Admin access required." },
      { status: 403 },
    );
  }

  try {
    const body = await req.json() as {
      action: "verify" | "suspend" | "activate" | "warn" | "ban";
    };

    // Fetch user info for email notifications
    const userRes = await db.execute({
      sql: "SELECT email, first_name FROM users WHERE id = ?",
      args: [id],
    });
    if (userRes.rows.length === 0) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "User not found." },
        { status: 404 },
      );
    }
    const userEmail = userRes.rows[0].email      as string;
    const firstName = userRes.rows[0].first_name as string;

    switch (body.action) {

      // ── Verify ──────────────────────────────────────────────────────────
      case "verify": {
        await db.execute({
          sql:  "UPDATE users SET is_verified = 1, account_status = 'active' WHERE id = ?",
          args: [id],
        });
        // FIXED: correct notification columns for real schema
        try {
          await db.execute({
            sql:  `INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'success', ?, ?)`,
            args: [
              Number(id),
              "Account Approved ✅",
              "Your account has been verified and approved! You can now log in and start using the platform.",
            ],
          });
        } catch (e) { console.warn("[Verify] Notification failed:", e); }

        sendEmail({
          to:      userEmail,
          subject: "Lubao Hub – Your account has been approved!",
          html:    emailAccountApproved(firstName),
        }).catch(console.error);
        break;
      }

      // ── Suspend ─────────────────────────────────────────────────────────
      case "suspend": {
        await db.execute({
          sql:  "UPDATE users SET account_status = 'suspended' WHERE id = ?",
          args: [id],
        });
        try {
          await db.execute({
            sql:  `INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'danger', ?, ?)`,
            args: [
              Number(id),
              "Account Suspended",
              "Your account has been suspended by the admin team. Contact support if you believe this is a mistake.",
            ],
          });
        } catch (e) { console.warn("[Suspend] Notification failed:", e); }
        sendEmail({
          to:      userEmail,
          subject: "Lubao Hub – Account Suspended",
          html:    emailAccountSuspended(firstName, "suspended"),
        }).catch(console.error);
        break;
      }

      // ── Activate ────────────────────────────────────────────────────────
      case "activate": {
        await db.execute({
          sql:  "UPDATE users SET account_status = 'active' WHERE id = ?",
          args: [id],
        });
        try {
          await db.execute({
            sql:  `INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'success', ?, ?)`,
            args: [Number(id), "Account Reactivated", "Your account has been reactivated. Welcome back!"],
          });
        } catch (e) { console.warn("[Activate] Notification failed:", e); }
        break;
      }

      // ── Warn ────────────────────────────────────────────────────────────
      // FIXED: no warning_count column in real schema — just send notification
      case "warn": {
        try {
          await db.execute({
            sql:  `INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'danger', ?, ?)`,
            args: [
              Number(id),
              "⚠️ Warning Issued",
              "You have received a warning from the Lubao Share Hub admin team. Please review the community guidelines.",
            ],
          });
        } catch (e) { console.warn("[Warn] Notification failed:", e); }
        break;
      }

      // ── Ban ─────────────────────────────────────────────────────────────
      case "ban": {
        await db.execute({
          sql:  "UPDATE users SET account_status = 'banned' WHERE id = ?",
          args: [id],
        });
        sendEmail({
          to:      userEmail,
          subject: "Lubao Hub – Account Banned",
          html:    emailAccountSuspended(firstName, "banned"),
        }).catch(console.error);
        break;
      }

      default:
        return NextResponse.json<ApiResponse>(
          { status: "error", message: "Invalid action." },
          { status: 400 },
        );
    }

    return NextResponse.json<ApiResponse>({
      status:  "success",
      message: `User ${body.action} successful.`,
    });

  } catch (err) {
    console.error("[User PATCH]", err);
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "Server error." },
      { status: 500 },
    );
  }
}
