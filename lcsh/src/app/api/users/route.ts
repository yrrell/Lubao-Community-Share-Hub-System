// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { ApiResponse, User } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "Admin access required." }, { status: 403 });
  }

  const res = await db.execute({
    sql: `SELECT id, username, email, first_name, middle_name, last_name, birthday, phone_number,
                 full_address, gov_id_path, profile_pic, role, account_status, is_verified, warning_count, created_at
          FROM users ORDER BY created_at DESC`,
    args: [],
  });
  return NextResponse.json<ApiResponse<User[]>>({ status: "success", data: res.rows as unknown as User[] });
}
