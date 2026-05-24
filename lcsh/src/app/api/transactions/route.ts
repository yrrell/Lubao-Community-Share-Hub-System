// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { ApiResponse, Transaction } from "@/types";

// GET /api/transactions  – get transactions relevant to current user
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode"); // "lender" | "borrower" | "all" (admin)

  try {
    let sql = "";
    let args: (string | number)[] = [];

    if (session.role === "admin" && mode === "all") {
      sql = `SELECT tx.*, t.name AS tool_name, t.image_url AS tool_image,
                    u.username AS borrower_username, u.first_name || ' ' || u.last_name AS borrower_name, u.email AS borrower_email
             FROM transactions tx
             JOIN tools t ON tx.tool_id = t.id
             JOIN users u ON tx.borrower_id = u.id
             ORDER BY tx.created_at DESC LIMIT 200`;
    } else if (mode === "lender") {
      sql = `SELECT tx.*, t.name AS tool_name, t.image_url AS tool_image,
                    u.username AS borrower_username, u.first_name || ' ' || u.last_name AS borrower_name, u.email AS borrower_email
             FROM transactions tx
             JOIN tools t ON tx.tool_id = t.id
             JOIN users u ON tx.borrower_id = u.id
             WHERE t.owner_id = ?
             ORDER BY tx.created_at DESC`;
      args = [session.id];
    } else {
      sql = `SELECT tx.*, t.name AS tool_name, t.image_url AS tool_image,
                    o.username AS owner_username
             FROM transactions tx
             JOIN tools t ON tx.tool_id = t.id
             JOIN users o ON t.owner_id = o.id
             WHERE tx.borrower_id = ?
             ORDER BY tx.created_at DESC`;
      args = [session.id];
    }

    const result = await db.execute({ sql, args });
    return NextResponse.json<ApiResponse<Transaction[]>>({ status: "success", data: result.rows as unknown as Transaction[] });
  } catch (err) {
    console.error("[Transactions GET]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}

// POST /api/transactions  – create a borrow request
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json<ApiResponse>({ status: "error", message: "Unauthorized." }, { status: 401 });

  try {
    const formData = await req.formData();
    const toolId       = Number(formData.get("tool_id"));
    const payMethod    = (formData.get("payment_method") as string) ?? "free";
    const gcashRef     = (formData.get("payment_ref") as string) || null;
    const screenshotFile = formData.get("payment_screenshot") as File | null;

    if (!toolId) return NextResponse.json<ApiResponse>({ status: "error", message: "Tool ID required." }, { status: 400 });

    // Check tool availability
    const toolRes = await db.execute({ sql: "SELECT * FROM tools WHERE id = ?", args: [toolId] });
    if (!toolRes.rows.length || toolRes.rows[0].status !== "available") {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Tool is no longer available." }, { status: 409 });
    }
    const tool = toolRes.rows[0];

    // Handle GCash screenshot
    let screenshotPath: string | null = null;
    if (payMethod === "gcash" && screenshotFile && screenshotFile.size > 0) {
      const dir = join(process.cwd(), "public", "uploads", "payments");
      await mkdir(dir, { recursive: true });
      const ext = screenshotFile.name.split(".").pop();
      const filename = `pay_${session.id}_${Date.now()}.${ext}`;
      await writeFile(join(dir, filename), Buffer.from(await screenshotFile.arrayBuffer()));
      screenshotPath = `/uploads/payments/${filename}`;
    }

    // Insert transaction
    const txRes = await db.execute({
      sql: `INSERT INTO transactions (tool_id, borrower_id, status, approval_status, payment_method, payment_ref, payment_screenshot)
            VALUES (?,?,'pending','pending',?,?,?)`,
      args: [toolId, session.id, payMethod, gcashRef, screenshotPath],
    });
    const txId = Number(txRes.lastInsertRowid);

    // Notify tool owner
    const msg = `New Request: @${session.username} wants to borrow your "${tool.name}".`;
    await db.execute({
      sql: `INSERT INTO notifications (user_id, message, type, related_id) VALUES (?,?,'borrow_request',?)`,
      args: [tool.owner_id, msg, txId],
    });

    return NextResponse.json<ApiResponse>({ status: "success", message: "Borrow request sent!", data: { tx_id: txId } });
  } catch (err) {
    console.error("[Transactions POST]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}
