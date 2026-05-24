// src/app/api/reports/route.ts
// FIXED: Uses correct `reports` table schema.
// POST: accepts FormData with issue_type, details, evidence file.
// GET:  returns all reports (admin) or own reports (user).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { ApiResponse } from "@/types";

// GET /api/reports
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });
    }

    let result;
    if (session.role === "admin") {
      // Admin sees all reports with reporter info
      result = await db.execute({
        sql: `
          SELECT r.*,
                 u.first_name || ' ' || u.last_name AS reporter_name,
                 u.username AS reporter_username
          FROM reports r
          JOIN users u ON r.user_id = u.id
          ORDER BY r.created_at DESC
        `,
        args: [],
      });
    } else {
      // User sees only their own reports
      result = await db.execute({
        sql: `SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC`,
        args: [session.id],
      });
    }

    return NextResponse.json<ApiResponse>({ status: "success", data: result.rows });
  } catch (err) {
    console.error("[Reports GET]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}

// POST /api/reports
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });
    }

    const formData  = await req.formData();
    const issueType = (formData.get("issue_type") as string)?.trim();
    const details   = (formData.get("details") as string)?.trim();
    const file      = formData.get("evidence") as File | null;

    if (!issueType || !details) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Issue type and details are required." },
        { status: 400 }
      );
    }
    if (details.length < 20) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Details must be at least 20 characters." },
        { status: 400 }
      );
    }

    let evidencePath: string | null = null;
    if (file && file.size > 0) {
      const dir = join(process.cwd(), "public", "uploads", "evidence");
      await mkdir(dir, { recursive: true });
      const ext      = file.name.split(".").pop();
      const filename = `EVD_${Date.now()}_${Math.floor(Math.random() * 99999)}.${ext}`;
      await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));
      evidencePath = `/uploads/evidence/${filename}`;
    }

    await db.execute({
      sql: `
        INSERT INTO reports (user_id, issue_type, details, evidence_path, status)
        VALUES (?, ?, ?, ?, 'pending')
      `,
      args: [session.id, issueType, details, evidencePath],
    });

    return NextResponse.json<ApiResponse>({
      status:  "success",
      message: "Report submitted successfully.",
    });
  } catch (err) {
    console.error("[Reports POST]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}
