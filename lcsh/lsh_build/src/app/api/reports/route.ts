// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const status  = req.nextUrl.searchParams.get("status") ?? "pending";
  const isAdmin = session.role === "admin";

  const sql = isAdmin
    ? `SELECT r.*, u.first_name||' '||u.last_name AS reporter_name, u.username AS reporter_username
       FROM reports r JOIN users u ON u.id = r.user_id
       WHERE r.status = ? ORDER BY r.created_at DESC`
    : `SELECT * FROM reports WHERE user_id = ? ORDER BY r.created_at DESC`;

  const res = await db.execute({ sql, args: isAdmin ? [status] : [session.id] });
  return NextResponse.json({ status: "success", data: res.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const fd         = await req.formData();
  const issue_type = (fd.get("issue_type") as string)?.trim();
  const details    = (fd.get("details") as string)?.trim();
  const evidence   = fd.get("evidence") as File | null;

  if (!issue_type || !details) {
    return NextResponse.json({ status: "error", message: "issue_type and details are required." }, { status: 400 });
  }

  let evidence_path: string | null = null;
  if (evidence && evidence.size > 0) {
    const dir = path.join(process.cwd(), "public/uploads/evidence");
    await mkdir(dir, { recursive: true });
    const ext  = evidence.name.split(".").pop() ?? "jpg";
    const name = `EV_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    await writeFile(path.join(dir, name), Buffer.from(await evidence.arrayBuffer()));
    evidence_path = `/uploads/evidence/${name}`;
  }

  const result = await db.execute({
    sql: `INSERT INTO reports (user_id, issue_type, details, evidence_path, status, created_at)
          VALUES (?,?,?,?,'pending',datetime('now')) RETURNING *`,
    args: [session.id, issue_type, details, evidence_path],
  });

  // Notify admins
  const adminsRes = await db.execute("SELECT id FROM users WHERE role='admin'");
  for (const admin of adminsRes.rows as { id: number }[]) {
    await db.execute({
      sql: `INSERT INTO notifications (user_id, type, message, related_id, created_at)
            VALUES (?, 'danger', ?, ?, datetime('now'))`,
      args: [admin.id, `New report submitted by @${session.username}: "${issue_type}"`, result.rows[0].id as number],
    });
  }

  return NextResponse.json({ status: "success", data: result.rows[0] }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ status: "error", message: "Admin only." }, { status: 403 });
  }
  const { id, action, resolution_note } = await req.json();
  if (!id || !action) return NextResponse.json({ status: "error", message: "id and action required." }, { status: 400 });

  const newStatus = action === "resolve" ? "resolved" : "dismissed";
  await db.execute({
    sql: "UPDATE reports SET status=?, resolution_note=? WHERE id=?",
    args: [newStatus, resolution_note ?? null, id],
  });
  return NextResponse.json({ status: "success" });
}
