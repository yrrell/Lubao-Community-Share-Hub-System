// src/app/api/tools/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

// PATCH /api/tools/[id]  – approve, decline, or update status (admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Admin access required." }, { status: 403 });
    }

    const body = await req.json() as { action?: string; approval_status?: string; status?: string };

    if (body.approval_status) {
      await db.execute({ sql: "UPDATE tools SET approval_status = ? WHERE id = ?", args: [body.approval_status, id] });
    }
    if (body.status) {
      await db.execute({ sql: "UPDATE tools SET status = ? WHERE id = ?", args: [body.status, id] });
    }

    return NextResponse.json<ApiResponse>({ status: "success", message: "Tool updated." });
  } catch (err) {
    console.error("[Tool PATCH]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}

// DELETE /api/tools/[id]  – soft-delete (hide) a tool
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });

    const toolRes = await db.execute({ sql: "SELECT owner_id FROM tools WHERE id = ?", args: [id] });
    if (!toolRes.rows.length) return NextResponse.json<ApiResponse>({ status: "error", message: "Tool not found." }, { status: 404 });

    const isOwner = toolRes.rows[0].owner_id === session.id;
    const isAdmin = session.role === "admin";
    if (!isOwner && !isAdmin) return NextResponse.json<ApiResponse>({ status: "error", message: "Forbidden." }, { status: 403 });

    await db.execute({ sql: "UPDATE tools SET status = 'hidden' WHERE id = ?", args: [id] });
    return NextResponse.json<ApiResponse>({ status: "success", message: "Tool removed." });
  } catch (err) {
    console.error("[Tool DELETE]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}
