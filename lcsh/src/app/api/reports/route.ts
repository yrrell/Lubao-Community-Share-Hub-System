// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { ApiResponse, Report } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "Admin access required." }, { status: 403 });
  }

  const res = await db.execute({
    sql: `SELECT r.*, u.username AS reporter_username, u.first_name || ' ' || u.last_name AS reporter_name
          FROM reports r JOIN users u ON r.user_id = u.id
          ORDER BY r.created_at DESC`,
    args: [],
  });
  return NextResponse.json<ApiResponse<Report[]>>({ status: "success", data: res.rows as unknown as Report[] });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });

  try {
    const formData = await req.formData();
    const issueType = (formData.get("issue_type") as string)?.trim();
    const details   = (formData.get("details") as string)?.trim();
    const evidence  = formData.get("evidence_photo") as File | null;

    if (!issueType || !details) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Issue type and details are required." }, { status: 400 });
    }

    let evidencePath: string | null = null;
    if (evidence && evidence.size > 0) {
      const dir = join(process.cwd(), "public", "uploads", "evidence");
      await mkdir(dir, { recursive: true });
      const ext = evidence.name.split(".").pop();
      const filename = `report_${Date.now()}_${session.id}.${ext}`;
      await writeFile(join(dir, filename), Buffer.from(await evidence.arrayBuffer()));
      evidencePath = `/uploads/evidence/${filename}`;
    }

    await db.execute({
      sql: `INSERT INTO reports (user_id, issue_type, details, evidence_path, status) VALUES (?,?,?,?,'pending')`,
      args: [session.id, issueType, details, evidencePath],
    });

    return NextResponse.json<ApiResponse>({ status: "success", message: "Report submitted successfully." });
  } catch (err) {
    console.error("[Reports POST]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}
