// src/app/api/transactions/route.ts
// FIXED: `transactions` → `borrows`, `tools` → `items`
//        Column renames: tools.name → items.title, tools.image_url → items.image_path
//        tools.status → items.is_available
//        Notification INSERT uses correct columns: (user_id, type, title, body)
//        Borrow INSERT includes required NOT NULL fields: owner_id, borrow_date, due_date
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { ApiResponse, Borrow } from "@/types";

// GET /api/transactions  – get borrows relevant to current user
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode"); // "lender" | "borrower" | "all" (admin)

  try {
    let sql = "";
    let args: (string | number)[] = [];

    if (session.role === "admin" && mode === "all") {
      sql = `
        SELECT b.*,
               i.title AS item_title, i.image_path AS item_image,
               u.username AS borrower_username,
               u.first_name || ' ' || u.last_name AS borrower_name,
               u.email AS borrower_email
        FROM borrows b
        JOIN items i ON b.item_id = i.id
        JOIN users u ON b.borrower_id = u.id
        ORDER BY b.created_at DESC
        LIMIT 200
      `;
    } else if (mode === "lender") {
      sql = `
        SELECT b.*,
               i.title AS item_title, i.image_path AS item_image,
               u.username AS borrower_username,
               u.first_name || ' ' || u.last_name AS borrower_name,
               u.email AS borrower_email
        FROM borrows b
        JOIN items i ON b.item_id = i.id
        JOIN users u ON b.borrower_id = u.id
        WHERE b.owner_id = ?
        ORDER BY b.created_at DESC
      `;
      args = [session.id];
    } else {
      sql = `
        SELECT b.*,
               i.title AS item_title, i.image_path AS item_image,
               o.username AS owner_username
        FROM borrows b
        JOIN items i ON b.item_id = i.id
        JOIN users o ON b.owner_id = o.id
        WHERE b.borrower_id = ?
        ORDER BY b.created_at DESC
      `;
      args = [session.id];
    }

    const result = await db.execute({ sql, args });
    return NextResponse.json<ApiResponse<Borrow[]>>({
      status: "success",
      data: result.rows as unknown as Borrow[],
    });
  } catch (err) {
    console.error("[Borrows GET]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}

// POST /api/transactions  – create a borrow request
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData      = await req.formData();
    const itemId        = Number(formData.get("tool_id") ?? formData.get("item_id"));
    const payMethod     = (formData.get("payment_method") as string) ?? "free";
    const gcashRef      = (formData.get("payment_ref") as string) || null;
    const borrowNote    = (formData.get("borrower_note") as string) || null;
    const screenshotFile = formData.get("payment_screenshot") as File | null;

    // Accept borrow_date / due_date from client, or default to today + max_borrow_days
    let borrowDate = (formData.get("borrow_date") as string) || new Date().toISOString().split("T")[0];
    let dueDate    = (formData.get("due_date") as string) || "";

    if (!itemId) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Item ID required." },
        { status: 400 },
      );
    }

    // Check item availability
    const itemRes = await db.execute({
      sql: "SELECT id, owner_id, title, is_available, is_active, max_borrow_days, fee_per_day, borrow_type FROM items WHERE id = ?",
      args: [itemId],
    });

    if (!itemRes.rows.length) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Item not found." },
        { status: 404 },
      );
    }

    const item = itemRes.rows[0];

    if (!Number(item.is_available) || !Number(item.is_active)) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Item is no longer available." },
        { status: 409 },
      );
    }

    // Prevent borrowing own item
    if (Number(item.owner_id) === session.id) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "You cannot borrow your own item." },
        { status: 400 },
      );
    }

    // Default due_date = borrow_date + max_borrow_days
    if (!dueDate) {
      const d = new Date(borrowDate);
      d.setDate(d.getDate() + Number(item.max_borrow_days ?? 7));
      dueDate = d.toISOString().split("T")[0];
    }

    // Calculate total_fee
    const days     = Math.max(1, Math.ceil((new Date(dueDate).getTime() - new Date(borrowDate).getTime()) / 86400000));
    const totalFee = (item.borrow_type === "fee_based") ? Number(item.fee_per_day) * days : 0;

    // Handle payment screenshot upload
    let screenshotPath: string | null = null;
    if (payMethod === "gcash" && screenshotFile && screenshotFile.size > 0) {
      const dir      = join(process.cwd(), "public", "uploads", "payments");
      await mkdir(dir, { recursive: true });
      const ext      = screenshotFile.name.split(".").pop();
      const filename = `pay_${session.id}_${Date.now()}.${ext}`;
      await writeFile(join(dir, filename), Buffer.from(await screenshotFile.arrayBuffer()));
      screenshotPath = `/uploads/payments/${filename}`;
    }

    // Insert borrow request
    const borrowRes = await db.execute({
      sql: `
        INSERT INTO borrows
          (item_id, borrower_id, owner_id, borrow_date, due_date,
           status, total_fee, payment_status, payment_method, payment_ref,
           payment_screenshot, borrower_note)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, 'unpaid', ?, ?, ?, ?)
      `,
      args: [
        itemId,
        session.id,
        item.owner_id,
        borrowDate,
        dueDate,
        totalFee,
        payMethod,
        gcashRef,
        screenshotPath,
        borrowNote,
      ],
    });

    const borrowId = Number(borrowRes.lastInsertRowid);

    // Notify item owner
    await db.execute({
      sql: `INSERT INTO notifications (user_id, type, title, body, link)
            VALUES (?, 'borrow_request', 'New Borrow Request', ?, ?)`,
      args: [
        item.owner_id,
        `@${session.username} wants to borrow your "${item.title}".`,
        `/my-items?borrow_id=${borrowId}`,
      ],
    });

    return NextResponse.json<ApiResponse>({
      status:  "success",
      message: "Borrow request sent!",
      data:    { borrow_id: borrowId },
    });
  } catch (err) {
    console.error("[Borrows POST]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}
