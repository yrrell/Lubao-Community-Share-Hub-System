// src/app/api/auth/login/route.ts  (UPDATED — replaces existing)
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken, buildAuthCookie } from "@/lib/auth";
import { sendEmail, emailLoginAlert } from "@/lib/email";
import type { ApiResponse, JwtPayload, UserRole } from "@/types";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

async function logSecurity(userId: number | null, action: string, ip: string, ua: string) {
  await db.execute({
    sql: "INSERT INTO security_logs (user_id, action, ip_address, user_agent, created_at) VALUES (?,?,?,?,datetime('now'))",
    args: [userId, action, ip, ua],
  }).catch(() => {}); // non-blocking
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";

  try {
    const { username, password } = await req.json() as { username: string; password: string };
    if (!username || !password) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Username and password are required." }, { status: 400 });
    }
    const lower = username.toLowerCase().trim();

    // ── 1. Admin path ──────────────────────────────────────────────────────
    const adminRes = await db.execute({
      sql: `SELECT id, username, password_hash, email, failed_attempts, is_locked, locked_until
            FROM admins WHERE LOWER(username) = ?`,
      args: [lower],
    });

    if (adminRes.rows.length > 0) {
      const admin = adminRes.rows[0] as {
        id: number; username: string; password_hash: string; email: string;
        failed_attempts: number; is_locked: number; locked_until: string | null;
      };

      // Check lockout
      if (admin.is_locked) {
        const until = admin.locked_until ? new Date(admin.locked_until) : null;
        if (until && until > new Date()) {
          const mins = Math.ceil((until.getTime() - Date.now()) / 60000);
          await logSecurity(admin.id, `Admin login blocked (locked) from ${ip}`, ip, ua);
          return NextResponse.json<ApiResponse>({
            status: "error",
            message: `Account locked. Try again in ${mins} minute(s).`,
          }, { status: 423 });
        }
        // Lockout expired — reset
        await db.execute({ sql: "UPDATE admins SET is_locked=0, locked_until=NULL, failed_attempts=0 WHERE id=?", args: [admin.id] });
      }

      const valid = await bcrypt.compare(password, admin.password_hash);
      if (!valid) {
        const newAttempts = admin.failed_attempts + 1;
        if (newAttempts >= MAX_ATTEMPTS) {
          const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
          await db.execute({ sql: "UPDATE admins SET failed_attempts=?, is_locked=1, locked_until=? WHERE id=?", args: [newAttempts, lockUntil, admin.id] });
          await logSecurity(admin.id, `Admin @${admin.username} LOCKED after ${MAX_ATTEMPTS} failed attempts from ${ip}`, ip, ua);
          return NextResponse.json<ApiResponse>({ status: "error", message: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.` }, { status: 423 });
        }
        await db.execute({ sql: "UPDATE admins SET failed_attempts=? WHERE id=?", args: [newAttempts, admin.id] });
        await logSecurity(admin.id, `Admin login failed (${newAttempts}/${MAX_ATTEMPTS}) from ${ip}`, ip, ua);
        return NextResponse.json<ApiResponse>({ status: "error", message: `Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.` }, { status: 401 });
      }

      // Success — reset attempts
      await db.execute({ sql: "UPDATE admins SET failed_attempts=0, is_locked=0, locked_until=NULL WHERE id=?", args: [admin.id] });
      await logSecurity(admin.id, `Admin @${admin.username} logged in from ${ip}`, ip, ua);

      const payload: JwtPayload = { id: admin.id, username: admin.username, role: "admin" };
      const token    = await signToken(payload);
      const response = NextResponse.json<ApiResponse>({ status: "success", message: "Logged in as admin." });
      response.cookies.set(buildAuthCookie(token));
      return response;
    }

    // ── 2. User path ───────────────────────────────────────────────────────
    const userRes = await db.execute({
      sql: "SELECT id, username, password_hash, email, first_name, account_status, is_verified, role FROM users WHERE LOWER(username) = ?",
      args: [lower],
    });

    if (!userRes.rows.length) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Invalid credentials." }, { status: 401 });
    }

    const user = userRes.rows[0] as {
      id: number; username: string; password_hash: string; email: string;
      first_name: string; account_status: string; is_verified: number; role: string;
    };

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await logSecurity(user.id, `User login failed from ${ip}`, ip, ua);
      return NextResponse.json<ApiResponse>({ status: "error", message: "Invalid credentials." }, { status: 401 });
    }

    if (user.is_verified === 0) {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Your account is pending admin verification. You'll receive an email once approved." }, { status: 403 });
    }
    if (user.account_status === "suspended") {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Your account is suspended. Submit an appeal via the Report page." }, { status: 403 });
    }
    if (user.account_status === "banned") {
      return NextResponse.json<ApiResponse>({ status: "error", message: "Your account has been permanently banned." }, { status: 403 });
    }

    // Login alert email (non-blocking)
    const ts = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    sendEmail({ to: user.email, subject: "Lubao Hub – New Login", html: emailLoginAlert(user.first_name, ts) }).catch(() => {});
    await logSecurity(user.id, `User @${user.username} logged in from ${ip}`, ip, ua);

    const payload: JwtPayload = { id: user.id, username: user.username, role: (user.role as UserRole) ?? "user" };
    const token    = await signToken(payload);
    const response = NextResponse.json<ApiResponse>({ status: "success", message: "Logged in successfully." });
    response.cookies.set(buildAuthCookie(token));
    return response;

  } catch (err) {
    console.error("[Login Error]", err);
    return NextResponse.json<ApiResponse>({ status: "error", message: "Server error." }, { status: 500 });
  }
}
