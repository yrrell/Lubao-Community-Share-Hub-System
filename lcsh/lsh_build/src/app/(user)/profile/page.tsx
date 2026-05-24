"use client";
// src/app/(user)/profile/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "admin") redirect("/admin/profile");

  const [userRes, violationsRes, borrowsRes] = await Promise.all([
    db.execute({ sql: "SELECT * FROM users WHERE id=?", args: [session.id] }),
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM reports WHERE user_id=?", args: [session.id] }),
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM transactions WHERE borrower_id=?", args: [session.id] }),
  ]);

  const user       = userRes.rows[0] as {
    id: number; username: string; email: string; first_name: string; middle_name: string | null;
    last_name: string; birthday: string; phone_number: string; full_address: string;
    profile_pic: string | null; is_verified: number; account_status: string; created_at: string;
  };
  const violations = Number((violationsRes.rows[0] as { cnt: number }).cnt);
  const borrows    = Number((borrowsRes.rows[0]    as { cnt: number }).cnt);

  if (!user) redirect("/login");

  async function updatePhone(fd: FormData) {
    "use server";
    const phone = fd.get("phone_number") as string;
    await db.execute({ sql: "UPDATE users SET phone_number=?, updated_at=datetime('now') WHERE id=?", args: [phone, session!.id] });
  }

  async function changePassword(fd: FormData) {
    "use server";
    const { hash }  = await import("bcryptjs");
    const newPass   = fd.get("new_password") as string;
    if (!newPass || newPass.length < 8) return;
    const hashed = await hash(newPass, 12);
    await db.execute({ sql: "UPDATE users SET password_hash=? WHERE id=?", args: [hashed, session!.id] });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-5 pt-14 md:pt-5 max-w-4xl space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Account Settings</h2>
            {user.is_verified === 1 && (
              <span className="badge bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-3 py-1 text-xs">
                ✅ ID Verified Resident
              </span>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-5">

            {/* Left: Profile Info */}
            <div className="lg:col-span-3 space-y-4">

              {/* Avatar + Name */}
              <div className="card flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-brand-100 dark:bg-brand-900/50 ring-4 ring-brand-200 dark:ring-brand-800">
                    {user.profile_pic ? (
                      <img src={`/${user.profile_pic}`} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-4xl font-black text-brand-600 dark:text-brand-400">
                        {user.first_name[0]}
                      </div>
                    )}
                  </div>
                  <form action="/api/profile/avatar" method="POST" encType="multipart/form-data" className="absolute bottom-0 right-0">
                    <label className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center cursor-pointer shadow text-white text-xs hover:bg-brand-700 transition-colors">
                      ✏
                      <input type="file" name="avatar" accept="image/*" className="hidden"
                        onChange={(e) => (e.target.form as HTMLFormElement)?.submit()} />
                    </label>
                  </form>
                </div>
                <div className="text-center">
                  <p className="font-black text-gray-900 dark:text-white text-lg">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Resident of Lubao, Pampanga</p>
                </div>
              </div>

              {/* Profile Information (locked fields) */}
              <div className="card space-y-4">
                <h3 className="font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2">
                  👤 Profile Information
                </h3>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Username</label>
                    <div className="input mt-1 bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 cursor-not-allowed">
                      {user.username}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Phone Number</label>
                    <div className="input mt-1 bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400">
                      {user.phone_number || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">First Name</label>
                    <div className="input mt-1 bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 cursor-not-allowed">
                      {user.first_name}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Middle Name</label>
                    <div className="input mt-1 bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 cursor-not-allowed">
                      {user.middle_name || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Last Name</label>
                    <div className="input mt-1 bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 cursor-not-allowed">
                      {user.last_name}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Birthday</label>
                    <div className="input mt-1 bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 cursor-not-allowed">
                      {user.birthday}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Account Status</label>
                  <div className="mt-1">
                    <span className={`badge ${user.account_status === "active" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                      {user.account_status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Registered Resident Address</label>
                  <div className="input mt-1 bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 cursor-not-allowed min-h-[60px] py-3">
                    {user.full_address || "—"}
                  </div>
                </div>

                {/* Locked Notice */}
                <div className="rounded-xl border border-yellow-200 dark:border-yellow-900/40 bg-yellow-50 dark:bg-yellow-900/20 p-3 text-xs text-yellow-800 dark:text-yellow-300">
                  <strong>🔒 Why can&apos;t I edit some fields?</strong><br />
                  To prevent outsiders and ensure community safety, your Name, Birthday, and Address are locked. If you need to update these (e.g., due to marriage or relocation within Lubao), please{" "}
                  <Link href="/report" className="underline font-semibold">Request an Information Update</Link> from the Admin.
                </div>

                {/* Update phone */}
                <form action={updatePhone}>
                  <button className="btn-primary w-full">Update Contact Number</button>
                </form>
              </div>
            </div>

            {/* Right column */}
            <div className="lg:col-span-2 space-y-4">

              {/* Account Standing */}
              <div className="card">
                <h3 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2 mb-3">
                  ⚠️ Account Standing
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Total Violations:</span>
                  <span className={`badge text-sm px-3 py-1 font-black ${violations === 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {violations}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Total Borrows:</span>
                  <span className="badge bg-blue-100 text-blue-700 text-sm px-3 py-1 font-black">{borrows}</span>
                </div>
              </div>

              {/* Security */}
              <div className="card">
                <h3 className="font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2 mb-3">
                  🛡 Security
                </h3>
                <form action={changePassword} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-slate-400">New Password</label>
                    <div className="relative mt-1">
                      <input type="password" name="new_password" placeholder="Enter new password"
                        className="input pr-10" minLength={8} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-slate-400">Confirm New Password</label>
                    <input type="password" name="confirm_password" placeholder="Re-type password"
                      className="input mt-1" />
                  </div>
                  <button type="submit" className="btn-secondary w-full">Change Password</button>
                </form>
              </div>

              {/* Quick links */}
              <div className="card">
                <h3 className="font-bold text-gray-700 dark:text-slate-300 mb-3 text-sm">Quick Actions</h3>
                <div className="space-y-2">
                  <Link href="/report" className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    🚩 Submit a Report
                  </Link>
                  <Link href="/my-requests" className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    📋 My Transactions
                  </Link>
                  <Link href="/tools" className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    🔧 Post a Tool
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
