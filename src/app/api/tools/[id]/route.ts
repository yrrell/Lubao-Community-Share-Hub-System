// src/app/api/tools/[id]/route.ts
// FIXED: `tools` → `items`
//        `approval_status` → removed (items uses is_active + is_available)
//        `status = 'hidden'` → `is_active = 0`
//        `status = 'available'` → `is_available = 1`
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types";

// PATCH /api/tools/[id]  – toggle availability or soft-delete (admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id }  = await params;
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Admin access required." },
        { status: 403 },
      );
    }

    const body = await req.json() as {
      is_available?: 0 | 1;
      is_active?:    0 | 1;
    };

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (body.is_available !== undefined) {
      updates.push("is_available = ?");
      args.push(body.is_available);
    }
    if (body.is_active !== undefined) {
      updates.push("is_active = ?");
      args.push(body.is_active);
    }

    if (!updates.length) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Nothing to update." },
        { status: 400 },
      );
    }

    updates.push("updated_at = datetime('now')");
    args.push(id);

    await db.execute({
      sql:  `UPDATE items SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });

    return NextResponse.json<ApiResponse>({ status: "success", message: "Item updated." });
  } catch (err) {
    console.error("[Item PATCH]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}

// DELETE /api/tools/[id]  – soft-delete: set is_active = 0
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id }  = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });
    }

    const itemRes = await db.execute({
      sql:  "SELECT owner_id FROM items WHERE id = ?",
      args: [id],
    });

    if (!itemRes.rows.length) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Item not found." }, { status: 404 });
    }

    const isOwner = Number(itemRes.rows[0].owner_id) === session.id;
    const isAdmin = session.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Forbidden." }, { status: 403 });
    }

    // Soft-delete: is_active = 0, also mark unavailable
    await db.execute({
      sql:  "UPDATE items SET is_active = 0, is_available = 0, updated_at = datetime('now') WHERE id = ?",
      args: [id],
    });

    return NextResponse.json<ApiResponse>({ status: "success", message: "Item removed." });
  } catch (err) {
    console.error("[Item DELETE]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}
