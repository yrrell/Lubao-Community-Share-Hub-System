// src/app/(admin)/admin/reports/page.tsx
// NEW PAGE: was returning 404. Shows borrow activity as the reports view
// since the real schema has no dedicated `reports` table.
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface BorrowReport {
  id: number;
  status: string;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  total_fee: number;
  created_at: string;
  item_title: string;
  borrower_name: string;
  borrower_username: string;
  owner_name: string;
  owner_username: string;
}

const statusColor: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  approved:  "bg-blue-100   text-blue-700",
  active:    "bg-brand-100  text-brand-700",
  returned:  "bg-green-100  text-green-700",
  cancelled: "bg-gray-100   text-gray-600",
  overdue:   "bg-red-100    text-red-600",
};

export default async function AdminReportsPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const res = await db.execute({
    sql: `SELECT b.id, b.status, b.borrow_date, b.due_date, b.return_date,
                 b.total_fee, b.created_at,
                 i.title AS item_title,
                 borrower.first_name || ' ' || borrower.last_name AS borrower_name,
                 borrower.username AS borrower_username,
                 owner.first_name || ' ' || owner.last_name AS owner_name,
                 owner.username AS owner_username
          FROM borrows b
          JOIN items i        ON b.item_id    = i.id
          JOIN users borrower ON b.borrower_id = borrower.id
          JOIN users owner    ON b.owner_id   = owner.id
          ORDER BY b.created_at DESC
          LIMIT 100`,
    args: [],
  });
  const borrows = res.rows.map(r => ({ ...r })) as unknown as BorrowReport[];

  // Summary stats
  const stats = {
    total:    borrows.length,
    pending:  borrows.filter(b => b.status === "pending").length,
    active:   borrows.filter(b => b.status === "active").length,
    overdue:  borrows.filter(b => b.status === "overdue").length,
    returned: borrows.filter(b => b.status === "returned").length,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />

      <div className="flex flex-col flex-1 min-w-0 md:ml-64">
        <Header />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-5 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reports</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Borrow activity overview</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="card border-l-4 border-gray-400">
                <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Total Borrows</p>
              </div>
              <div className="card border-l-4 border-yellow-400">
                <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.pending}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Pending</p>
              </div>
              <div className="card border-l-4 border-red-400">
                <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.overdue}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Overdue</p>
              </div>
              <div className="card border-l-4 border-green-400">
                <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.returned}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Returned</p>
              </div>
            </div>

            {/* Borrow log */}
            <div className="card overflow-x-auto">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Borrow Log</h3>
              {borrows.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">No borrow activity yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 text-left">
                      <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Item</th>
                      <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Borrower</th>
                      <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Owner</th>
                      <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Dates</th>
                      <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {borrows.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{b.item_title}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">#{b.id}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-gray-700 dark:text-slate-300">{b.borrower_name}</p>
                          <p className="text-xs text-gray-400">@{b.borrower_username}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-gray-700 dark:text-slate-300">{b.owner_name}</p>
                          <p className="text-xs text-gray-400">@{b.owner_username}</p>
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-500 dark:text-slate-400">
                          <p>{new Date(b.borrow_date).toLocaleDateString("en-PH")}</p>
                          <p>→ {new Date(b.due_date).toLocaleDateString("en-PH")}</p>
                        </td>
                        <td className="py-3">
                          <span className={`badge text-[10px] ${statusColor[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
