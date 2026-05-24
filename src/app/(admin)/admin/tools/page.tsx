// src/app/(admin)/admin/tools/page.tsx
// NEW PAGE: was returning 404. Shows item inventory using real `items` schema.
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface ItemRow {
  id: number;
  title: string;
  description: string | null;
  condition: string;
  borrow_type: string;
  fee_per_day: number;
  is_available: number;
  is_active: number;
  borrow_count: number;
  created_at: string;
  owner_username: string;
  owner_name: string;
}

const conditionBadge: Record<string, string> = {
  new:      "bg-green-100  text-green-700",
  like_new: "bg-teal-100   text-teal-700",
  good:     "bg-blue-100   text-blue-700",
  fair:     "bg-yellow-100 text-yellow-700",
  poor:     "bg-red-100    text-red-600",
};

export default async function AdminToolsPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const res = await db.execute({
    sql: `SELECT i.id, i.title, i.description, i.condition, i.borrow_type,
                 i.fee_per_day, i.is_available, i.is_active, i.borrow_count, i.created_at,
                 u.username AS owner_username,
                 u.first_name || ' ' || u.last_name AS owner_name
          FROM items i
          JOIN users u ON i.owner_id = u.id
          ORDER BY i.created_at DESC`,
    args: [],
  });
  const items = res.rows.map(r => ({ ...r })) as unknown as ItemRow[];

  const activeCount    = items.filter(i => i.is_active === 1).length;
  const availableCount = items.filter(i => i.is_available === 1).length;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />

      <div className="flex flex-col flex-1 min-w-0 md:ml-64">
        <Header />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-5 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card border-l-4 border-brand-400 text-center">
                <p className="text-2xl font-black text-gray-900 dark:text-white">{items.length}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Total Items</p>
              </div>
              <div className="card border-l-4 border-green-400 text-center">
                <p className="text-2xl font-black text-gray-900 dark:text-white">{availableCount}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Available</p>
              </div>
              <div className="card border-l-4 border-yellow-400 text-center">
                <p className="text-2xl font-black text-gray-900 dark:text-white">{items.length - activeCount}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Inactive</p>
              </div>
            </div>

            {/* Table */}
            <div className="card overflow-x-auto">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Item Inventory</h3>
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">No items found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 text-left">
                      <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Item</th>
                      <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Owner</th>
                      <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Condition</th>
                      <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Type</th>
                      <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Borrows</th>
                      <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{item.title}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">#{item.id}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-gray-700 dark:text-slate-300">{item.owner_name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">@{item.owner_username}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`badge text-[10px] ${conditionBadge[item.condition] ?? "bg-gray-100 text-gray-600"}`}>
                            {item.condition.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-700 dark:text-slate-300 capitalize">
                          {item.borrow_type === "fee_based" ? `₱${item.fee_per_day}/day` : item.borrow_type}
                        </td>
                        <td className="py-3 pr-4 text-gray-700 dark:text-slate-300">{item.borrow_count}</td>
                        <td className="py-3">
                          <span className={`badge text-[10px] ${
                            item.is_active === 0 ? "bg-gray-100 text-gray-500" :
                            item.is_available === 1 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {item.is_active === 0 ? "Inactive" : item.is_available === 1 ? "Available" : "Borrowed"}
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
