// src/app/api/auth/register/route.ts
// Notification INSERT uses correct schema columns: (user_id, type, title, body)
// Admin lookup queries users WHERE role='admin' (correct — no separate admins table in this schema)
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const formData    = await req.formData();
    const username    = (formData.get("username")      as string)?.trim();
    const email       = (formData.get("email")         as string)?.trim();
    const password    =  formData.get("password")      as string;
    const firstName   = (formData.get("first_name")    as string)?.trim();
    const middleName  = (formData.get("middle_name")   as string)?.trim() || null;
    const lastName    = (formData.get("last_name")     as string)?.trim();
    const birthday    =  formData.get("birthday")      as string;
    const phone       = (formData.get("phone_number")  as string)?.trim();
    const house       = (formData.get("house_street")  as string)?.trim();
    const barangay    = (formData.get("barangay")      as string)?.trim();
    const city        = (formData.get("city_province") as string)?.trim();
    const fullAddress = [house, barangay, city].filter(Boolean).join(", ");

    if (!username || !email || !password || !firstName || !lastName || !birthday) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Required fields are missing." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const passwordHash  = await bcrypt.hash(password, 12);
    const uploadsBase   = join(process.cwd(), "public", "uploads");

    // Gov ID upload
    let govIdPath: string | null = null;
    const govIdFile = formData.get("gov_id") as File | null;
    if (govIdFile && govIdFile.size > 0) {
      const dir      = join(uploadsBase, "ids");
      await mkdir(dir, { recursive: true });
      const ext      = govIdFile.name.split(".").pop();
      const filename = `ID_${Date.now()}_${Math.floor(Math.random() * 9999)}.${ext}`;
      await writeFile(join(dir, filename), Buffer.from(await govIdFile.arrayBuffer()));
      govIdPath = `/uploads/ids/${filename}`;
    }

    // Profile picture upload
    let profilePicPath = "/uploads/defaults/default-user.png";
    const profileFile  = formData.get("profile_pic") as File | null;
    if (profileFile && profileFile.size > 0) {
      const dir      = join(uploadsBase, "profiles");
      await mkdir(dir, { recursive: true });
      const ext      = profileFile.name.split(".").pop();
      const filename = `PROFILE_${Date.now()}.${ext}`;
      await writeFile(join(dir, filename), Buffer.from(await profileFile.arrayBuffer()));
      profilePicPath = `/uploads/profiles/${filename}`;
    }

    // Insert user — account_status = 'pending' until admin verifies
    await db.execute({
      sql: `
        INSERT INTO users
          (username, email, password_hash, first_name, middle_name, last_name,
           birthday, phone_number, full_address, gov_id_path, profile_pic,
           role, account_status, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 'pending', 0)
      `,
      args: [
        username, email, passwordHash,
        firstName, middleName, lastName,
        birthday, phone, fullAddress,
        govIdPath, profilePicPath,
      ],
    });

    // Notify all admins of the new pending registration
    try {
      const admins = await db.execute({
        sql:  "SELECT id FROM users WHERE role = 'admin'",
        args: [],
      });
      for (const admin of admins.rows) {
        await db.execute({
          sql: `
            INSERT INTO notifications (user_id, type, title, body, link)
            VALUES (?, 'system', 'New Registration Pending', ?, ?)
          `,
          args: [
            admin.id as number,
            `New registration: ${firstName} ${lastName} (${email}) is awaiting identity verification.`,
            `/admin/users`,
          ],
        });
      }
    } catch (notifErr) {
      // Non-fatal — log and continue
      console.warn("[Register] Could not create admin notifications:", notifErr);
    }

    return NextResponse.json<ApiResponse>({
      status:  "success",
      message: "Registration successful! Please wait for admin verification.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Username or email already exists." },
        { status: 409 },
      );
    }
    console.error("[Register Error]", err);
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "Server error. Please try again." },
      { status: 500 },
    );
  }
}
