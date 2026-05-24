// src/app/api/auth/session/route.ts
// Returns the current session user with profile data for client components.
// Used by the Post Tool page and profile page to show lender details.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Not authenticated." }, { status: 401 });
    }

    // Fetch full user profile for client-side use
    const result = await db.execute({
      sql: `SELECT id, username, email, first_name, middle_name, last_name,
                   phone_number, full_address, profile_pic,
                   role, account_status, is_verified, warning_count
            FROM users WHERE id = ?`,
      args: [session.id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "User not found." }, { status: 404 });
    }

    const [user] = result.rows as unknown as [{
      id: number; username: string; email: string;
      first_name: string; middle_name: string | null; last_name: string;
      phone_number: string | null; full_address: string | null;
      profile_pic: string | null; role: string;
      account_status: string; is_verified: number; warning_count: number;
    }];

    // Unread counts for badge display
    const [notifRes, msgRes, pendRes] = await Promise.all([
      db.execute({ sql: "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0", args: [session.id] }),
      db.execute({ sql: "SELECT COUNT(*) AS cnt FROM messages WHERE receiver_id = ? AND is_read = 0", args: [session.id] }),
      db.execute({ sql: "SELECT COUNT(*) AS cnt FROM borrows WHERE owner_id = ? AND status = 'pending'", args: [session.id] }),
    ]);

    return NextResponse.json<ApiResponse>({
      status: "success",
      data: {
        user,
        unread: {
          notifications: Number((notifRes.rows[0] as { cnt: number }).cnt),
          messages:       Number((msgRes.rows[0]   as { cnt: number }).cnt),
          pending:        Number((pendRes.rows[0]   as { cnt: number }).cnt),
        },
      },
    });
  } catch (err) {
    console.error("[Session GET]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}
