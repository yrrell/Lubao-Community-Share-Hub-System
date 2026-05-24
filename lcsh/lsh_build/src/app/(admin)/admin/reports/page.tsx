// src/app/(admin)/admin/reports/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import type { Report } from "@/types";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const { status = "pending" } = await searchParams;

  // Ensure reports table has resolution fields
  await db.execute(`CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    issue_type TEXT NOT NULL,
    details TEXT NOT NULL,
    evidence_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    resolution_note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const [reportsRes, countsRes] = await Promise.all([
    db.execute({
      sql: `SELECT r.*, u.first_name || ' ' || u.last_name AS reporter_name, u.username AS reporter_username
            FROM reports r
            JOIN users u ON u.id = r.user_id
            WHERE r.status = ?
            ORDER BY r.created_at DESC`,
      args: [status],
    }),
    db.execute(`SELECT
      SUM(CASE WHEN status='pending'  THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN status='dismissed' THEN 1 ELSE 0 END) AS dismissed
      FROM reports`),
  ]);

  const reports = reportsRes.rows as unknown as (Report & { reporter_name: string; reporter_username: string })[];
  const counts  = countsRes.rows[0] as { pending: number; resolved: number; dismissed: number };

  async function resolveReport(id: number, note: string) {
    "use server";
    await db.execute({ sql: "UPDATE reports SET status='resolved', resolution_note=? WHERE id=?", args: [note, id] });
  }

  async function dismissReport(id: number) {
    "use server";
    await db.execute({ sql: "UPDATE reports SET status='dismissed' WHERE id=?", args: [id] });
  }

  const TABS = [
    { key: "pending",   label: "Pending",   count: counts?.pending  ?? 0, color: "text-yellow-600" },
    { key: "resolved",  label: "Resolved",  count: counts?.resolved ?? 0, color: "text-green-600" },
    { key: "dismissed", label: "Dismissed", count: counts?.dismissed ?? 0, color: "text-gray-400" },
  ];

  const issueColors: Record<string, string> = {
    "Broken Tool / Damage":    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    "Non-Return":              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    "Scam / Fraud":            "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    "Harassment":              "bg-pink-100 text-pink-700",
    "Appeal - Account Suspension": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    "Other":                   "bg-gray-100 text-gray-700",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-5 pt-14 md:pt-5 space-y-6 max-w-5xl">

          {/* Header */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              🚩 Reports &amp; Appeals
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Review and resolve community reports.</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card border-l-4 border-yellow-400">
              <p className="text-2xl font-black text-gray-900 dark:text-white">{counts?.pending ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Open / Pending</p>
            </div>
            <div className="card border-l-4 border-green-400">
              <p className="text-2xl font-black text-gray-900 dark:text-white">{counts?.resolved ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Resolved</p>
            </div>
            <div className="card border-l-4 border-gray-300">
              <p className="text-2xl font-black text-gray-900 dark:text-white">{counts?.dismissed ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Dismissed</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-slate-800 p-1 w-fit">
            {TABS.map((t) => (
              <a key={t.key} href={`/admin/reports?status=${t.key}`}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  status === t.key
                    ? "bg-white dark:bg-slate-900 shadow text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-700"
                }`}>
                {t.label}
                <span className={`ml-1.5 badge ${t.color} bg-transparent`}>({t.count})</span>
              </a>
            ))}
          </div>

          {/* Reports List */}
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge text-xs ${issueColors[report.issue_type] ?? "bg-gray-100 text-gray-700"}`}>
                        {report.issue_type}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-slate-500">Report #{report.id}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">{report.details}</p>
                    {report.resolution_note && (
                      <div className="mt-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40 px-3 py-2 text-xs text-green-700 dark:text-green-300">
                        <strong>Resolution:</strong> {report.resolution_note}
                      </div>
                    )}
                  </div>
                  {report.evidence_path && (
                    <a href={report.evidence_path} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 h-16 w-16 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                      <img src={report.evidence_path} alt="Evidence" className="h-full w-full object-cover" />
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
                  <span>
                    Submitted by <strong className="text-gray-700 dark:text-slate-300">@{report.reporter_username}</strong> ·{" "}
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>

                {status === "pending" && (
                  <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-slate-800">
                    <form action={async (fd: FormData) => {
                      "use server";
                      const note = (fd.get("note") as string) || "Resolved by admin.";
                      await resolveReport(report.id, note);
                    }} className="flex gap-2 flex-1">
                      <input name="note" placeholder="Resolution note (optional)…"
                        className="input text-xs flex-1 py-1.5" />
                      <button type="submit" className="btn-primary text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700">
                        ✓ Resolve
                      </button>
                    </form>
                    <form action={async () => { "use server"; await dismissReport(report.id); }}>
                      <button className="btn-secondary text-xs px-3 py-1.5 text-gray-500">
                        Dismiss
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}

            {reports.length === 0 && (
              <div className="card text-center py-10 text-gray-400 dark:text-slate-500">
                <p className="text-4xl mb-2">✅</p>
                <p className="font-medium">No {status} reports.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
