// src/app/(admin)/admin/users/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import type { User } from "@/types";

interface UserRow extends User {
  violation_count: number;
  borrow_count: number;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const { q = "", tab = "all" } = await searchParams;

  const whereStatus = tab === "suspended" ? "AND u.account_status = 'suspended'"
    : tab === "pending" ? "AND u.is_verified = 0"
    : "";

  const usersRes = await db.execute({
    sql: `SELECT u.*,
            COALESCE(w.cnt, 0) AS violation_count,
            COALESCE(b.cnt, 0) AS borrow_count
          FROM users u
          LEFT JOIN (SELECT user_id, COUNT(*) AS cnt FROM reports GROUP BY user_id) w ON w.user_id = u.id
          LEFT JOIN (SELECT borrower_id, COUNT(*) AS cnt FROM transactions GROUP BY borrower_id) b ON b.borrower_id = u.id
          WHERE u.role = 'user'
            ${whereStatus}
            AND (? = '' OR u.first_name || ' ' || u.last_name LIKE '%' || ? || '%' OR u.username LIKE '%' || ? || '%')
          ORDER BY u.created_at DESC`,
    args: [q, q, q],
  });

  const countsRes = await db.execute(`SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN account_status='suspended' THEN 1 ELSE 0 END) AS suspended,
    SUM(CASE WHEN is_verified=0 THEN 1 ELSE 0 END) AS pending
    FROM users WHERE role='user'`);

  const users  = usersRes.rows  as unknown as UserRow[];
  const counts = countsRes.rows[0] as { total: number; suspended: number; pending: number };

  async function verifyUser(id: number) {
    "use server";
    await db.execute({ sql: "UPDATE users SET is_verified=1, account_status='active' WHERE id=?", args: [id] });
  }
  async function suspendUser(id: number) {
    "use server";
    await db.execute({ sql: "UPDATE users SET account_status='suspended' WHERE id=?", args: [id] });
  }
  async function reinstateUser(id: number) {
    "use server";
    await db.execute({ sql: "UPDATE users SET account_status='active' WHERE id=?", args: [id] });
  }
  async function deleteUser(id: number) {
    "use server";
    await db.execute({ sql: "DELETE FROM users WHERE id=?", args: [id] });
  }

  const TABS = [
    { key: "all",       label: "All Users",  count: counts?.total     ?? 0 },
    { key: "pending",   label: "Pending",    count: counts?.pending   ?? 0 },
    { key: "suspended", label: "Suspended",  count: counts?.suspended ?? 0 },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-5 pt-14 md:pt-5 space-y-6 max-w-6xl">

          {/* Header + Search */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Community Users</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">{counts?.total ?? 0} registered residents</p>
            </div>
            <form className="flex gap-2">
              <input name="tab" type="hidden" value={tab} />
              <input name="q" defaultValue={q} placeholder="Search users…"
                className="input text-sm py-2 w-52" />
            </form>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-slate-800 p-1 w-fit">
            {TABS.map((t) => (
              <a key={t.key} href={`/admin/users?tab=${t.key}${q ? `&q=${q}` : ""}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.key
                    ? "bg-white dark:bg-slate-900 shadow text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-700"
                }`}>
                {t.label} ({t.count})
              </a>
            ))}
          </div>

          {/* Table */}
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">User Info</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Points</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Contact &amp; Address</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Violations</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <a href={`/admin/users/${user.id}`} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                        {user.first_name} {user.last_name}
                      </a>
                      <p className="text-xs text-gray-400 dark:text-slate-500">ID: #{user.id}</p>
                      {user.gov_id_path && (
                        <a href={user.gov_id_path} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline">View ID</a>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-gray-800 dark:text-slate-200">
                        {(100 - user.violation_count * 10).toFixed(0)} pts
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-[160px]">
                      {user.phone_number && <p className="text-xs text-gray-600 dark:text-slate-300">P: {user.phone_number}</p>}
                      {user.full_address  && <p className="text-xs text-gray-400 dark:text-slate-500 truncate">A: {user.full_address}</p>}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`badge text-xs ${
                        !user.is_verified ? "bg-yellow-100 text-yellow-700" :
                        user.account_status === "active" ? "bg-green-100 text-green-700" :
                        user.account_status === "suspended" ? "bg-orange-100 text-orange-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {!user.is_verified ? "Pending" : user.account_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-bold ${user.violation_count > 0 ? "text-red-600" : "text-gray-400 dark:text-slate-600"}`}>
                        {user.violation_count}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        {!user.is_verified && (
                          <form action={async () => { "use server"; await verifyUser(user.id); }}>
                            <button className="btn-primary text-xs px-2 py-1">✓ Verify</button>
                          </form>
                        )}
                        {user.is_verified && user.account_status === "active" && (
                          <form action={async () => { "use server"; await suspendUser(user.id); }}>
                            <button className="btn-secondary text-xs px-2 py-1 text-orange-600 border-orange-200 hover:bg-orange-50">
                              ⚠ Suspend
                            </button>
                          </form>
                        )}
                        {user.account_status === "suspended" && (
                          <form action={async () => { "use server"; await reinstateUser(user.id); }}>
                            <button className="btn-primary text-xs px-2 py-1 bg-green-600 hover:bg-green-700">Reinstate</button>
                          </form>
                        )}
                        <form action={async () => { "use server"; await deleteUser(user.id); }}>
                          <button className="btn-secondary text-xs px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">🗑</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400 dark:text-slate-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
