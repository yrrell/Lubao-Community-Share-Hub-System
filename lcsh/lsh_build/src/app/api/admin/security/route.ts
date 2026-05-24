// src/app/api/admin/security/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ status: "error", message: "Admin only." }, { status: 403 });
  }

  const body   = await req.json();
  const action = body.action as string;

  if (action === "add_admin") {
    const { username, email, password } = body;
    if (!username || !email || !password) {
      return NextResponse.json({ status: "error", message: "username, email, password required." }, { status: 400 });
    }
    const hash = await bcrypt.hash(password, 12);
    try {
      await db.execute({
        sql: "INSERT INTO admins (username, email, password_hash, created_at) VALUES (?,?,?,datetime('now'))",
        args: [username, email, hash],
      });
      await db.execute({
        sql: `INSERT INTO security_logs (action, created_at) VALUES (?, datetime('now'))`,
        args: [`Admin @${session.username} added new admin: @${username}`],
      });
      return NextResponse.json({ status: "success", message: "Admin created." });
    } catch {
      return NextResponse.json({ status: "error", message: "Username or email already exists." }, { status: 409 });
    }
  }

  if (action === "reset_attempts") {
    const { id } = body;
    await db.execute({ sql: "UPDATE admins SET failed_attempts=0, is_locked=0, locked_until=NULL WHERE id=?", args: [id] });
    await db.execute({
      sql: `INSERT INTO security_logs (action, created_at) VALUES (?, datetime('now'))`,
      args: [`Admin @${session.username} reset failed attempts for admin ID ${id}`],
    });
    return NextResponse.json({ status: "success" });
  }

  if (action === "delete_admin") {
    const { id } = body;
    // Prevent self-deletion
    const selfRes = await db.execute({ sql: "SELECT id FROM admins WHERE username=?", args: [session.username] });
    if (selfRes.rows.length && (selfRes.rows[0] as { id: number }).id === id) {
      return NextResponse.json({ status: "error", message: "Cannot delete your own account." }, { status: 400 });
    }
    await db.execute({ sql: "DELETE FROM admins WHERE id=?", args: [id] });
    await db.execute({
      sql: `INSERT INTO security_logs (action, created_at) VALUES (?, datetime('now'))`,
      args: [`Admin @${session.username} deleted admin ID ${id}`],
    });
    return NextResponse.json({ status: "success" });
  }

  return NextResponse.json({ status: "error", message: "Unknown action." }, { status: 400 });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ status: "error", message: "Admin only." }, { status: 403 });
  }

  const [adminsRes, logsRes] = await Promise.all([
    db.execute("SELECT id, username, email, failed_attempts, is_locked, locked_until, account_status, created_at FROM admins ORDER BY created_at DESC"),
    db.execute(`SELECT sl.*, u.username FROM security_logs sl
                LEFT JOIN users u ON u.id = sl.user_id
                ORDER BY sl.created_at DESC LIMIT 50`),
  ]);

  return NextResponse.json({
    status: "success",
    data: { admins: adminsRes.rows, logs: logsRes.rows },
  });
}
