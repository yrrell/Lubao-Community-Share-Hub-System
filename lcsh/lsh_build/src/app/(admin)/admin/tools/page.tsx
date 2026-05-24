// src/app/(admin)/admin/tools/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";

interface ToolRow {
  id: number;
  name: string;
  description: string;
  image_url: string | null;
  status: string;
  approval_status: string;
  created_at: string;
  owner_name: string;
  owner_username: string;
  barangay: string | null;
  borrow_type?: string;
}

export default async function AdminToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const { tab = "pending", q = "" } = await searchParams;

  const [toolsRes, countsRes] = await Promise.all([
    db.execute({
      sql: `SELECT t.*,
              u.first_name || ' ' || u.last_name AS owner_name,
              u.username AS owner_username,
              u.full_address AS barangay
            FROM tools t
            JOIN users u ON u.id = t.owner_id
            WHERE t.approval_status = ?
              AND (? = '' OR t.name LIKE '%' || ? || '%')
            ORDER BY t.created_at DESC`,
      args: [tab, q, q],
    }),
    db.execute(`SELECT
      SUM(CASE WHEN approval_status='pending'  THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN approval_status='approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN approval_status='declined' THEN 1 ELSE 0 END) AS declined
      FROM tools`),
  ]);

  const tools  = toolsRes.rows  as unknown as ToolRow[];
  const counts = countsRes.rows[0] as { pending: number; approved: number; declined: number };

  async function approveTool(id: number) {
    "use server";
    await db.execute({ sql: "UPDATE tools SET approval_status='approved', status='available' WHERE id=?", args: [id] });
  }
  async function declineTool(id: number) {
    "use server";
    await db.execute({ sql: "UPDATE tools SET approval_status='declined', status='hidden' WHERE id=?", args: [id] });
  }
  async function deleteTool(id: number) {
    "use server";
    await db.execute({ sql: "DELETE FROM tools WHERE id=?", args: [id] });
  }
  async function toggleAvailability(id: number, current: string) {
    "use server";
    await db.execute({ sql: "UPDATE tools SET status=? WHERE id=?", args: [current === "available" ? "hidden" : "available", id] });
  }

  const TABS = [
    { key: "pending",  label: "Pending Review", count: counts?.pending  ?? 0 },
    { key: "approved", label: "Approved",        count: counts?.approved ?? 0 },
    { key: "declined", label: "Declined",        count: counts?.declined ?? 0 },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-5 pt-14 md:pt-5 space-y-6 max-w-6xl">

          {/* Header */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">🔧 Tool Inventory</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Review and manage community tool listings.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {TABS.map((t) => (
              <div key={t.key} className={`card border-l-4 ${
                t.key === "pending" ? "border-yellow-400" :
                t.key === "approved" ? "border-green-400" : "border-red-400"
              }`}>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{t.count}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-slate-800 p-1">
              {TABS.map((t) => (
                <a key={t.key} href={`/admin/tools?tab=${t.key}${q ? `&q=${q}` : ""}`}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    tab === t.key
                      ? "bg-white dark:bg-slate-900 shadow text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-slate-400"
                  }`}>
                  {t.label} ({t.count})
                </a>
              ))}
            </div>
            <form className="flex-1 min-w-[200px]">
              <input name="q" defaultValue={q}
                type="hidden" />
              <input name="tab" type="hidden" value={tab} />
              <input name="q" defaultValue={q}
                placeholder="Search tools…"
                className="input text-sm py-2" />
            </form>
          </div>

          {/* Tool Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <div key={tool.id} className="card flex flex-col gap-3">
                {/* Image */}
                <div className="h-36 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800">
                  {tool.image_url ? (
                    <img src={tool.image_url} alt={tool.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-4xl text-gray-300 dark:text-slate-600">🔧</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-gray-900 dark:text-white">{tool.name}</h4>
                    <span className={`badge text-xs shrink-0 ${
                      tool.status === "available" ? "bg-green-100 text-green-700" :
                      tool.status === "borrowed"  ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>{tool.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{tool.description || "No description."}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">
                    Owner: <strong className="text-gray-700 dark:text-slate-300">@{tool.owner_username}</strong>
                    {tool.barangay && <> · {tool.barangay.split(",")[0]}</>}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    Posted: {new Date(tool.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="border-t border-gray-100 dark:border-slate-800 pt-3 flex gap-2 flex-wrap">
                  {tab === "pending" && (
                    <>
                      <form action={async () => { "use server"; await approveTool(tool.id); }} className="flex-1">
                        <button className="btn-primary w-full text-xs py-1.5">✓ Approve</button>
                      </form>
                      <form action={async () => { "use server"; await declineTool(tool.id); }}>
                        <button className="btn-danger text-xs py-1.5 px-3">✕ Decline</button>
                      </form>
                    </>
                  )}
                  {tab === "approved" && (
                    <form action={async () => { "use server"; await toggleAvailability(tool.id, tool.status); }} className="flex-1">
                      <button className={`btn-secondary w-full text-xs py-1.5 ${tool.status === "available" ? "text-orange-600" : "text-green-600"}`}>
                        {tool.status === "available" ? "⊘ Hide Listing" : "◉ Show Listing"}
                      </button>
                    </form>
                  )}
                  <form action={async () => { "use server"; await deleteTool(tool.id); }}>
                    <button className="btn-secondary text-xs py-1.5 px-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">🗑</button>
                  </form>
                </div>
              </div>
            ))}

            {tools.length === 0 && (
              <div className="col-span-full card text-center py-12 text-gray-400 dark:text-slate-500">
                <p className="text-4xl mb-2">📦</p>
                <p>No {tab} tool listings.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
