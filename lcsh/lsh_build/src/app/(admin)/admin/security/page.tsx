"use client";
// src/app/(admin)/admin/security/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";

interface AdminRow {
  id: number;
  username: string;
  email: string;
  failed_attempts: number;
  is_locked: number;
  locked_until: string | null;
  account_status: string;
  created_at: string;
}

interface LogRow {
  id: number;
  user_id: number | null;
  action: string;
  ip_address: string;
  user_agent: string | null;
  created_at: string;
  username?: string;
}

export default async function SecurityPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  // Ensure security tables exist
  await db.execute(`CREATE TABLE IF NOT EXISTS admin_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    profile_pic TEXT,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    is_locked INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    account_status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS security_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const [adminsRes, logsRes, lockoutsRes] = await Promise.all([
    db.execute(`SELECT id, username, email, failed_attempts, is_locked, locked_until, account_status, created_at
                FROM admin_accounts ORDER BY created_at DESC`),
    db.execute(`SELECT sl.*, u.username
                FROM security_logs sl
                LEFT JOIN users u ON u.id = sl.user_id
                ORDER BY sl.created_at DESC LIMIT 50`),
    db.execute(`SELECT COUNT(*) AS cnt FROM admin_accounts WHERE is_locked = 1`),
  ]);

  const admins   = adminsRes.rows as unknown as AdminRow[];
  const logs     = logsRes.rows as unknown as LogRow[];
  const lockouts = Number((lockoutsRes.rows[0] as { cnt: number }).cnt);

  // Server action: reset failed attempts
  async function resetAdmin(id: number) {
    "use server";
    await db.execute({ sql: "UPDATE admin_accounts SET failed_attempts = 0, is_locked = 0, locked_until = NULL WHERE id = ?", args: [id] });
  }

  // Server action: delete admin
  async function deleteAdmin(id: number) {
    "use server";
    await db.execute({ sql: "DELETE FROM admin_accounts WHERE id = ?", args: [id] });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-5 pt-14 md:pt-5 space-y-6 max-w-6xl">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-red-500">👥</span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Security</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Manage administrative access and system lockouts.</p>
            </div>
            <form action={async () => {
              "use server";
              // Add new admin — placeholder; use modal in production
            }}>
              <a href="/admin/security/new"
                className="btn-primary text-sm px-4 py-2">
                + Add New Admin
              </a>
            </form>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card border-l-4 border-red-400">
              <div className="flex items-center gap-3">
                <span className="text-2xl text-red-500">⚠️</span>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Total Admins</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white">{admins.length}</p>
                </div>
              </div>
            </div>
            <div className="card border-l-4 border-yellow-400">
              <div className="flex items-center gap-3">
                <span className="text-2xl text-yellow-500">👥</span>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Active Lockouts</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white">{lockouts}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Accounts Table */}
          <div className="card">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Administrative Accounts</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Admin Username</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Failed Attempts</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Account Status</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">System Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-slate-300">
                            {admin.username[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {admin.username}
                            {admin.username === session.username && (
                              <span className="ml-2 badge bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-400">You</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`badge ${admin.failed_attempts >= 5 ? "bg-red-100 text-red-600" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300"}`}>
                          {admin.failed_attempts} / 5
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`badge ${admin.is_locked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                          {admin.is_locked ? "🔒 Locked" : "✅ Active"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-2">
                          <form action={async () => { "use server"; await resetAdmin(admin.id); }}>
                            <button className="btn-secondary text-xs px-3 py-1 text-yellow-700 border-yellow-200 hover:bg-yellow-50">
                              ↺ Reset
                            </button>
                          </form>
                          {admin.username !== session.username && (
                            <form action={async () => { "use server"; await deleteAdmin(admin.id); }}>
                              <button className="btn-danger text-xs px-3 py-1">🗑</button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {admins.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-gray-400 text-sm">No admin accounts found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>ℹ️ Security Tip:</strong> Admins are automatically locked out for 10 minutes after 5 failed login attempts to prevent brute-force attacks.
              </p>
            </div>
          </div>

          {/* Security Logs */}
          <div className="card">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Recent Security Logs</h3>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-slate-800 p-3 text-sm">
                  <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                    log.action.includes("fail") || log.action.includes("block") ? "bg-red-400" :
                    log.action.includes("login") ? "bg-green-400" : "bg-blue-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-slate-200">{log.action}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {log.username ? `@${log.username}` : "System"} · {log.ip_address || "—"} · {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">No security logs recorded yet.</p>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
