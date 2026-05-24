// src/app/(admin)/admin/profile/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";

export default async function AdminProfilePage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const adminRes = await db.execute({
    sql: "SELECT id, username, email, profile_pic, created_at FROM admins WHERE username=?",
    args: [session.username],
  });
  const admin = adminRes.rows[0] as {
    id: number; username: string; email: string; profile_pic: string | null; created_at: string;
  } | undefined;

  const logsRes = await db.execute({
    sql: `SELECT action, ip_address, created_at FROM security_logs
          WHERE user_id = (SELECT id FROM admins WHERE username=?) OR (action LIKE '%admin%' AND action LIKE ?||'%')
          ORDER BY created_at DESC LIMIT 10`,
    args: [session.username, session.username],
  });
  const logs = logsRes.rows as { action: string; ip_address: string; created_at: string }[];

  async function changePassword(fd: FormData) {
    "use server";
    const { hash, compare } = await import("bcryptjs");
    const current = fd.get("current_password") as string;
    const next    = fd.get("new_password") as string;
    if (!current || !next || next.length < 8) return;
    const adminRow = await db.execute({ sql: "SELECT password_hash FROM admins WHERE username=?", args: [session!.username] });
    if (!adminRow.rows.length) return;
    const valid = await compare(current, adminRow.rows[0].password_hash as string);
    if (!valid) return;
    const hashed = await hash(next, 12);
    await db.execute({ sql: "UPDATE admins SET password_hash=? WHERE username=?", args: [hashed, session!.username] });
    await db.execute({
      sql: `INSERT INTO security_logs (action, created_at) VALUES (?, datetime('now'))`,
      args: [`Admin @${session!.username} changed their password`],
    });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-5 pt-14 md:pt-5 max-w-3xl space-y-6">

          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Profile</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Manage your administrator account.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Card */}
            <div className="card space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-brand-600 flex items-center justify-center text-2xl font-black text-white">
                  {session.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-gray-900 dark:text-white text-lg">@{session.username}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{admin?.email ?? "—"}</p>
                  <span className="badge bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs mt-1">Administrator</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Username</p>
                  <div className="input bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 cursor-not-allowed text-sm py-2">
                    {session.username}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Role</p>
                  <div className="input bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 cursor-not-allowed text-sm py-2">
                    Administrator
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Account Created</p>
                  <div className="input bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 cursor-not-allowed text-sm py-2">
                    {admin ? new Date(admin.created_at).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="card space-y-4">
              <h3 className="font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2">
                🛡 Change Password
              </h3>
              <form action={changePassword} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400">Current Password</label>
                  <input type="password" name="current_password" className="input mt-1" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400">New Password</label>
                  <input type="password" name="new_password" className="input mt-1" minLength={8} required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400">Confirm New Password</label>
                  <input type="password" name="confirm_password" className="input mt-1" required />
                </div>
                <button type="submit" className="btn-primary w-full">Update Password</button>
              </form>
            </div>
          </div>

          {/* Recent Activity Logs */}
          <div className="card">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
            <div className="space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-50 dark:border-slate-800 p-3 text-sm">
                  <span className="h-2 w-2 rounded-full bg-brand-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-700 dark:text-slate-300">{log.action}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      {log.ip_address || "—"} · {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">No recent activity logged.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
