// src/app/api/tools/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { ApiResponse, Tool } from "@/types";

// GET /api/tools  – list available & approved tools
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true"; // admin flag

    const session = await getSession();
    const isAdmin = session?.role === "admin";

    const sql = isAdmin && all
      ? `SELECT t.*, u.username AS owner_username, u.first_name || ' ' || u.last_name AS owner_name
         FROM tools t JOIN users u ON t.owner_id = u.id
         ORDER BY t.created_at DESC`
      : `SELECT t.*, u.username AS owner_username, u.first_name || ' ' || u.last_name AS owner_name
         FROM tools t JOIN users u ON t.owner_id = u.id
         WHERE t.approval_status = 'approved' AND t.status = 'available'
         ORDER BY t.created_at DESC`;

    const result = await db.execute(sql);
    return NextResponse.json<ApiResponse<Tool[]>>({ status: "success", data: result.rows as unknown as Tool[] });
  } catch (err) {
    console.error("[Tools GET]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Failed to fetch tools." }, { status: 500 });
  }
}

// POST /api/tools  – create a new tool listing
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });

    const formData = await req.formData();
    const name        = (formData.get("tool_name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const imageFile   = formData.get("tool_photo") as File | null;

    if (!name) return NextResponse.json<ApiResponse>({ status: "error", message: "Tool name is required." }, { status: 400 });

    let imageUrl = "/uploads/defaults/default-tool.png";
    if (imageFile && imageFile.size > 0) {
      const dir = join(process.cwd(), "public", "uploads", "tools");
      await mkdir(dir, { recursive: true });
      const ext = imageFile.name.split(".").pop();
      const filename = `TOOL_${Date.now()}_${Math.floor(Math.random() * 99999)}.${ext}`;
      await writeFile(join(dir, filename), Buffer.from(await imageFile.arrayBuffer()));
      imageUrl = `/uploads/tools/${filename}`;
    }

    await db.execute({
      sql: `INSERT INTO tools (name, description, image_url, owner_id, status, approval_status) VALUES (?,?,?,?,'available','pending')`,
      args: [name, description ?? null, imageUrl, session.id],
    });

    return NextResponse.json<ApiResponse>({ status: "success", message: "Tool submitted for approval." });
  } catch (err) {
    console.error("[Tools POST]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}
