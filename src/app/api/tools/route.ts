// src/app/api/tools/route.ts
// BUG FIX: The original route queried a `tools` table that does NOT exist in
// the schema. The actual table is `items` (with `is_available`, `is_active`,
// `borrow_type`, `fee_per_day`, `condition`, `category_id` columns).
// Also fixed POST to insert into `items` with correct column names.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { ApiResponse } from "@/types";

// GET /api/tools  – list items (available + active, or all for admin)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const all       = searchParams.get("all") === "true";
    const borrowType = searchParams.get("borrow_type"); // "free" | "fee_based" | "donation"

    const session = await getSession();
    const isAdmin = session?.role === "admin";

    let sql: string;
    const args: (string | number)[] = [];

    if (isAdmin && all) {
      sql = `
        SELECT i.*, u.username AS owner_username,
               u.first_name || ' ' || u.last_name AS owner_name
        FROM items i
        JOIN users u ON i.owner_id = u.id
        ORDER BY i.created_at DESC
      `;
    } else {
      sql = `
        SELECT i.*, u.username AS owner_username,
               u.first_name || ' ' || u.last_name AS owner_name
        FROM items i
        JOIN users u ON i.owner_id = u.id
        WHERE i.is_available = 1 AND i.is_active = 1
      `;
      if (borrowType && ["free", "fee_based", "donation"].includes(borrowType)) {
        sql += ` AND i.borrow_type = ?`;
        args.push(borrowType);
      }
      sql += ` ORDER BY i.created_at DESC`;
    }

    const result = await db.execute({ sql, args });
    return NextResponse.json<ApiResponse>({ status: "success", data: result.rows });
  } catch (err) {
    console.error("[Items GET]", err);
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "Failed to fetch items." },
      { status: 500 }
    );
  }
}

// POST /api/tools  – create a new item listing
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Unauthorized." },
        { status: 401 }
      );
    }

    const formData   = await req.formData();
    const title      = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() ?? null;
    const condition  = (formData.get("condition") as string)?.trim() ?? "good";
    const borrowType = (formData.get("borrow_type") as string)?.trim() ?? "free";
    const feePerDay  = parseFloat((formData.get("fee_per_day") as string) ?? "0") || 0;
    const location   = (formData.get("location") as string)?.trim() ?? null;
    const categoryId = formData.get("category_id") ? Number(formData.get("category_id")) : null;
    const imageFile  = formData.get("image") as File | null;

    if (!title) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Item title is required." },
        { status: 400 }
      );
    }

    // Validate enums
    const validConditions  = ["new", "like_new", "good", "fair", "poor"];
    const validBorrowTypes = ["free", "fee_based", "donation"];
    if (!validConditions.includes(condition)) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Invalid condition value." },
        { status: 400 }
      );
    }
    if (!validBorrowTypes.includes(borrowType)) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Invalid borrow type." },
        { status: 400 }
      );
    }

    let imagePath: string | null = null;
    if (imageFile && imageFile.size > 0) {
      const dir = join(process.cwd(), "public", "uploads", "items");
      await mkdir(dir, { recursive: true });
      const ext      = imageFile.name.split(".").pop();
      const filename = `ITEM_${Date.now()}_${Math.floor(Math.random() * 99999)}.${ext}`;
      await writeFile(join(dir, filename), Buffer.from(await imageFile.arrayBuffer()));
      imagePath = `/uploads/items/${filename}`;
    }

    await db.execute({
      sql: `
        INSERT INTO items
          (owner_id, category_id, title, description, condition,
           borrow_type, fee_per_day, location, image_path, is_available, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      `,
      args: [
        session.id,
        categoryId,
        title,
        description,
        condition,
        borrowType,
        feePerDay,
        location,
        imagePath,
      ],
    });

    return NextResponse.json<ApiResponse>({
      status:  "success",
      message: "Item posted successfully.",
    });
  } catch (err) {
    console.error("[Items POST]", err);
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "Server error. Failed to post item." },
      { status: 500 }
    );
  }
}
