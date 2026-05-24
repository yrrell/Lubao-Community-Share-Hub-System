"use client";
// src/app/(user)/tools/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Link from "next/link";

interface MyTool {
  id: number;
  name: string;
  description: string;
  image_url: string | null;
  status: string;
  approval_status: string;
  payment_method: string;
  created_at: string;
  borrow_count: number;
  condition_note?: string;
  known_issues?: string;
  service_type?: string;
  landmark?: string;
}

export default async function ToolsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const myToolsRes = await db.execute({
    sql: "SELECT * FROM tools WHERE owner_id=? ORDER BY created_at DESC",
    args: [session.id],
  });
  const myTools = myToolsRes.rows as unknown as MyTool[];

  async function postTool(fd: FormData) {
    "use server";
    const name        = fd.get("name") as string;
    const description = fd.get("description") as string;
    const condition   = fd.get("condition") as string;
    const issues      = fd.get("known_issues") as string;
    const payment     = fd.get("payment_method") as string;
    const service     = fd.get("service_type") as string;
    const landmark    = fd.get("landmark") as string;
    const fee         = parseFloat((fd.get("fee") as string) || "0");

    if (!name) return;

    await db.execute({
      sql: `INSERT INTO tools (name, description, owner_id, payment_method, status, approval_status,
              condition_note, known_issues, service_type, landmark, fee, created_at)
            VALUES (?,?,?,'free','available','pending',?,?,?,?,?,datetime('now'))`,
      args: [name, description, session!.id, condition, issues, service, landmark, fee],
    });

    // Notify admin (insert into notifications for admin users)
    await db.execute({
      sql: `INSERT INTO notifications (user_id, type, message, created_at)
            SELECT id, 'info', 'New tool posted by @' || ?, datetime('now')
            FROM users WHERE role = 'admin'`,
      args: [session!.username],
    });

    redirect("/tools");
  }

  async function toggleTool(id: number, current: string) {
    "use server";
    await db.execute({
      sql: "UPDATE tools SET status=? WHERE id=? AND owner_id=?",
      args: [current === "available" ? "hidden" : "available", id, session!.id],
    });
  }

  async function deleteTool(id: number) {
    "use server";
    await db.execute({ sql: "DELETE FROM tools WHERE id=? AND owner_id=?", args: [id, session!.id] });
  }

  const approvalColors: Record<string, string> = {
    pending:  "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-5 pt-14 md:pt-5 max-w-5xl space-y-6">

          <div className="grid gap-6 lg:grid-cols-2">

            {/* Post New Tool Form */}
            <div className="card">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                🔧 Post a Tool / Item
              </h3>

              <form action={postTool} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Tool / Item Name *</label>
                  <input name="name" placeholder="e.g. Welding Machine, Grass Cutter…" required
                    className="input mt-1" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Description *</label>
                  <textarea name="description" placeholder="Describe the tool — brand, model, capacity, what it does…"
                    className="input mt-1 min-h-[80px] resize-none" required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Condition</label>
                    <select name="condition" className="input mt-1">
                      <option value="new">New</option>
                      <option value="like_new">Like New</option>
                      <option value="good" selected>Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor — Needs Care</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Payment Type</label>
                    <select name="payment_method" className="input mt-1">
                      <option value="free">Free 🎁</option>
                      <option value="cash">Cash 💵</option>
                      <option value="gcash">GCash 📱</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Fee per day (if applicable)</label>
                  <input name="fee" type="number" min="0" step="0.50" placeholder="0.00"
                    className="input mt-1" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Known Issues (sealed — visible only to approved borrowers)</label>
                  <textarea name="known_issues" placeholder="Any damage, quirks, or important notes about the tool…"
                    className="input mt-1 min-h-[60px] resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Service Type</label>
                    <select name="service_type" className="input mt-1">
                      <option value="pickup">Pickup / Walk-in</option>
                      <option value="delivery">Delivery</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Location / Landmark</label>
                    <input name="landmark" placeholder="e.g. Near San Nicolas Chapel"
                      className="input mt-1" />
                  </div>
                </div>

                <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 p-3 text-xs text-blue-700 dark:text-blue-300">
                  ℹ️ Your tool listing will be reviewed by an admin before appearing publicly. You&apos;ll be notified once approved.
                </div>

                <button type="submit" className="btn-primary w-full">
                  📤 Submit for Review
                </button>
              </form>
            </div>

            {/* My Tools List */}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">My Posted Tools ({myTools.length})</h3>
              <div className="space-y-3">
                {myTools.map((tool) => (
                  <div key={tool.id} className="card flex items-start gap-3">
                    <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800">
                      {tool.image_url
                        ? <img src={tool.image_url} alt={tool.name} className="h-full w-full object-cover" />
                        : <div className="h-full w-full flex items-center justify-center text-2xl text-gray-300">🔧</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white truncate">{tool.name}</p>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        <span className={`badge text-xs ${approvalColors[tool.approval_status] ?? "bg-gray-100 text-gray-500"}`}>
                          {tool.approval_status}
                        </span>
                        <span className={`badge text-xs ${tool.status === "available" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                          {tool.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                        Borrowed {tool.borrow_count ?? 0}× · Posted {new Date(tool.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {tool.approval_status === "approved" && (
                        <form action={async () => { "use server"; await toggleTool(tool.id, tool.status); }}>
                          <button className={`btn-secondary text-xs px-2 py-1 ${tool.status === "available" ? "text-orange-600" : "text-green-600"}`}>
                            {tool.status === "available" ? "Hide" : "Show"}
                          </button>
                        </form>
                      )}
                      <form action={async () => { "use server"; await deleteTool(tool.id); }}>
                        <button className="btn-secondary text-xs px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">🗑</button>
                      </form>
                    </div>
                  </div>
                ))}
                {myTools.length === 0 && (
                  <div className="card text-center py-10 text-gray-400 dark:text-slate-500">
                    <p className="text-3xl mb-2">📦</p>
                    <p className="text-sm">You haven&apos;t posted any tools yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
