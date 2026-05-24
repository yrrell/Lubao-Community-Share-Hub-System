// src/app/api/profile/avatar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });

  const fd     = await req.formData();
  const avatar = fd.get("avatar") as File | null;

  if (!avatar || avatar.size === 0) {
    return NextResponse.json({ status: "error", message: "No file provided." }, { status: 400 });
  }

  if (avatar.size > 5 * 1024 * 1024) {
    return NextResponse.json({ status: "error", message: "File too large. Max 5MB." }, { status: 413 });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(avatar.type)) {
    return NextResponse.json({ status: "error", message: "Invalid file type." }, { status: 415 });
  }

  const dir = path.join(process.cwd(), "public/uploads/profiles");
  await mkdir(dir, { recursive: true });

  const ext  = avatar.name.split(".").pop() ?? "jpg";
  const name = `PROFILE_${session.id}_${Date.now()}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await avatar.arrayBuffer()));

  const filePath = `uploads/profiles/${name}`;
  await db.execute({
    sql: "UPDATE users SET profile_pic=?, updated_at=datetime('now') WHERE id=?",
    args: [filePath, session.id],
  });

  return NextResponse.json({ status: "success", data: { profile_pic: filePath } });
}
