// src/app/(admin)/admin/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import type { User } from "@/types";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const [toolsRes, usersRes, txRes, reportsRes, pendingUsersRes, recentTxRes] = await Promise.all([
    db.execute("SELECT COUNT(*) AS cnt FROM tools WHERE approval_status = 'pending'"),
    db.execute("SELECT COUNT(*) AS cnt FROM users WHERE is_verified = 0"),
    db.execute("SELECT COUNT(*) AS cnt FROM transactions WHERE status = 'pending'"),
    db.execute("SELECT COUNT(*) AS cnt FROM reports WHERE status = 'pending'"),
    db.execute(`SELECT id, first_name, last_name, email, gov_id_path, full_address, profile_pic, created_at
                FROM users WHERE is_verified = 0 ORDER BY created_at DESC LIMIT 8`),
    db.execute(`SELECT t.*, u.first_name || ' ' || u.last_name AS borrower_name, tl.name AS tool_name
                FROM transactions t
                JOIN users u ON u.id = t.borrower_id
                JOIN tools tl ON tl.id = t.tool_id
                ORDER BY t.created_at DESC LIMIT 5`),
  ]);

  const counts = {
    pendingTools:     Number((toolsRes.rows[0]   as { cnt: number }).cnt),
    unverifiedUsers:  Number((usersRes.rows[0]   as { cnt: number }).cnt),
    pendingTx:        Number((txRes.rows[0]      as { cnt: number }).cnt),
    openReports:      Number((reportsRes.rows[0] as { cnt: number }).cnt),
  };
  const unverified = pendingUsersRes.rows as unknown as (User & { created_at: string })[];
  const recentTx   = recentTxRes.rows as unknown as { id: number; borrower_name: string; tool_name: string; status: string; created_at: string }[];

  async function verifyUser(id: number) {
    "use server";
    await db.execute({ sql: "UPDATE users SET is_verified=1, account_status='active' WHERE id=?", args: [id] });
  }
  async function rejectUser(id: number) {
    "use server";
    await db.execute({ sql: "DELETE FROM users WHERE id=?", args: [id] });
  }

  const statCards = [
    { label: "Pending Tool Reviews", value: counts.pendingTools,    href: "/admin/tools",    color: "border-yellow-400", icon: "🔧" },
    { label: "Pending Registrations", value: counts.unverifiedUsers, href: "/admin/users?tab=pending", color: "border-blue-400",   icon: "👤" },
    { label: "Active Borrow Requests", value: counts.pendingTx,     href: "/admin/reports",  color: "border-brand-500", icon: "📋" },
    { label: "Open Reports",           value: counts.openReports,   href: "/admin/reports",  color: "border-red-400",   icon: "🚩" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-5 pt-14 md:pt-5 space-y-6 max-w-6xl">

          {/* Header */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Welcome back, <strong>@{session.username}</strong> — here's your overview.
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((s) => (
              <Link key={s.href + s.label} href={s.href}
                className={`card border-l-4 ${s.color} hover:shadow-md transition-shadow flex flex-col gap-1`}>
                <span className="text-2xl">{s.icon}</span>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{s.label}</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">

            {/* Pending Registrations */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Pending ID Verifications</h3>
                <Link href="/admin/users?tab=pending" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">View all →</Link>
              </div>
              {unverified.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                  <p className="text-3xl mb-1">✅</p>
                  <p className="text-sm">All registrations reviewed!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unverified.map((user) => (
                    <div key={user.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-slate-800 p-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                        {user.profile_pic ? (
                          <img src={`/${user.profile_pic}`} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-lg font-black text-gray-400">
                            {user.first_name?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 dark:text-slate-200">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{user.email}</p>
                        {user.full_address && (
                          <p className="text-xs text-gray-400 dark:text-slate-500 truncate">📍 {user.full_address}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {user.gov_id_path && (
                          <a href={`/${user.gov_id_path}`} target="_blank" rel="noopener noreferrer"
                            className="btn-secondary text-xs px-2 py-1">ID</a>
                        )}
                        <form action={async () => { "use server"; await verifyUser(user.id); }}>
                          <button className="btn-primary text-xs px-2 py-1 w-full">✓ Verify</button>
                        </form>
                        <form action={async () => { "use server"; await rejectUser(user.id); }}>
                          <button className="btn-danger text-xs px-2 py-1 w-full">✕ Reject</button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Recent Borrow Activity</h3>
              </div>
              <div className="space-y-2">
                {recentTx.map((tx) => (
                  <div key={tx.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-slate-800 p-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-slate-200">{tx.tool_name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">by {tx.borrower_name}</p>
                    </div>
                    <span className={`badge text-xs ${
                      tx.status === "pending"   ? "bg-yellow-100 text-yellow-700" :
                      tx.status === "active"    ? "bg-green-100 text-green-700" :
                      tx.status === "returned"  ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>{tx.status}</span>
                  </div>
                ))}
                {recentTx.length === 0 && (
                  <p className="text-center text-sm text-gray-400 dark:text-slate-500 py-6">No recent transactions.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
