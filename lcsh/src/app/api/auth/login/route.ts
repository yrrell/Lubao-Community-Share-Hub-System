import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken, buildAuthCookie } from "@/lib/auth";
import { sendEmail, emailLoginAlert } from "@/lib/email";
import type { ApiResponse, JwtPayload, UserRole } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body as { username: string; password: string };

    if (!username || !password) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Username and password are required." },
        { status: 400 }
      );
    }

    const lower = username.toLowerCase().trim();

    const userRes = await db.execute({
      sql: `SELECT id, username, password_hash, email, first_name, role,
                   account_status, is_verified
            FROM users WHERE LOWER(username) = ?`,
      args: [lower],
    });

    if (userRes.rows.length === 0) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Invalid credentials." },
        { status: 401 }
      );
    }

    const user  = userRes.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash as string);
    if (!valid) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Invalid credentials." },
        { status: 401 }
      );
    }

    const isVerified    = Number(user.is_verified);
    const accountStatus = String(user.account_status);
    const role          = String(user.role) as UserRole;

    if (role !== "admin" && isVerified === 0) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Your account is pending admin verification." },
        { status: 403 }
      );
    }
    if (accountStatus === "suspended") {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Your account has been suspended." },
        { status: 403 }
      );
    }
    if (accountStatus === "banned") {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: "Your account has been permanently banned." },
        { status: 403 }
      );
    }

    const ts = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    sendEmail({
      to:      user.email as string,
      subject: "Lubao Hub – New Login Detected",
      html:    emailLoginAlert(user.first_name as string, ts),
    }).catch(console.error);

    const payload: JwtPayload = {
      id:       user.id       as number,
      username: user.username as string,
      role,
    };
    const token    = await signToken(payload);
    const response = NextResponse.json<ApiResponse>({
      status:  "success",
      message: role === "admin" ? "Logged in as admin." : "Logged in successfully.",
    });
    response.cookies.set(buildAuthCookie(token));
    return response;

  } catch (err) {
    console.error("[Login Error]", err);
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "Server error." },
      { status: 500 }
    );
  }
}