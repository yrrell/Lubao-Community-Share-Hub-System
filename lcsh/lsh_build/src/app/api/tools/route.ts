// src/app/api/tools/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const payment = req.nextUrl.searchParams.get("payment") ?? "";
  const q       = req.nextUrl.searchParams.get("q") ?? "";
  const brgy    = req.nextUrl.searchParams.get("brgy") ?? "";
  const mine    = req.nextUrl.searchParams.get("mine") === "1";

  const payFilter = payment && payment !== "all" ? `AND t.payment_method = '${payment}'` : "";
  const ownerFilter = mine ? `AND t.owner_id = ${session.id}` : `AND t.owner_id != ${session.id}`;

  const approvedFilter = mine ? "" : "AND t.approval_status = 'approved' AND t.status = 'available'";

  const res = await db.execute({
    sql: `SELECT t.*,
            u.first_name||' '||u.last_name AS owner_name, u.username AS owner_username,
            u.profile_pic AS owner_pic, u.full_address AS barangay
          FROM tools t JOIN users u ON u.id = t.owner_id
          WHERE 1=1 ${ownerFilter} ${approvedFilter} ${payFilter}
            AND (? = '' OR t.name LIKE '%'||?||'%' OR t.description LIKE '%'||?||'%')
            AND (? = '' OR u.full_address LIKE '%'||?||'%')
          ORDER BY t.created_at DESC`,
    args: [q, q, q, brgy, brgy],
  });

  return NextResponse.json({ status: "success", data: res.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const fd = await req.formData();
  const name           = fd.get("name") as string;
  const description    = fd.get("description") as string;
  const payment_method = (fd.get("payment_method") as string) || "free";
  const fee            = parseFloat((fd.get("fee") as string) || "0");
  const condition      = (fd.get("condition") as string) || "good";
  const known_issues   = fd.get("known_issues") as string;
  const service_type   = fd.get("service_type") as string;
  const landmark       = fd.get("landmark") as string;
  const imageFile      = fd.get("image") as File | null;

  if (!name) return NextResponse.json({ status: "error", message: "Tool name is required." }, { status: 400 });

  let image_url: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const buf   = Buffer.from(await imageFile.arrayBuffer());
    const fname = `TOOL_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const fpath = path.join(process.cwd(), "public/uploads/tools", fname);
    await writeFile(fpath, buf);
    image_url = `uploads/tools/${fname}`;
  }

  const result = await db.execute({
    sql: `INSERT INTO tools (name, description, owner_id, payment_method, fee, condition_note,
            known_issues, service_type, landmark, image_url, status, approval_status, created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,'available','pending',datetime('now')) RETURNING *`,
    args: [name, description, session.id, payment_method, fee, condition,
           known_issues ?? null, service_type ?? null, landmark ?? null, image_url],
  });

  // Notify all admins
  const adminsRes = await db.execute("SELECT id FROM users WHERE role='admin'");
  for (const admin of adminsRes.rows as { id: number }[]) {
    await db.execute({
      sql: `INSERT INTO notifications (user_id, type, message, related_id, created_at)
            VALUES (?, 'info', ?, ?, datetime('now'))`,
      args: [admin.id, `New tool submitted by @${session.username}: "${name}"`, result.rows[0].id as number],
    });
  }

  return NextResponse.json({ status: "success", data: result.rows[0] }, { status: 201 });
}
