// src/app/api/admin/dashboard/route.ts
// FIXED: uses `items` and `borrows` tables (real schema). No `reports` table.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json(
      { status: "error", message: "Admin access required." },
      { status: 403 },
    );
  }

  const [itemsRes, usersRes, borrowsRes, pendingUsersRes] = await Promise.all([
    db.execute("SELECT COUNT(*) AS cnt FROM items WHERE is_active = 1"),
    db.execute("SELECT COUNT(*) AS cnt FROM users WHERE is_verified = 0"),
    db.execute("SELECT COUNT(*) AS cnt FROM borrows WHERE status = 'pending'"),
    db.execute(
      `SELECT id, first_name, last_name, gov_id_path, email
       FROM users WHERE is_verified = 0 ORDER BY created_at ASC LIMIT 15`,
    ),
  ]);

  return NextResponse.json({
    counts: {
      totalItems:      Number((itemsRes.rows[0]   as { cnt: number }).cnt),
      unverifiedUsers: Number((usersRes.rows[0]   as { cnt: number }).cnt),
      pendingBorrows:  Number((borrowsRes.rows[0] as { cnt: number }).cnt),
      openReports:     0,
    },
    // Serialise rows to plain objects
    unverified: pendingUsersRes.rows.map(r => ({ ...r })),
  });
}
