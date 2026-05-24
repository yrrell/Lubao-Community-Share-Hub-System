"use client";
// src/app/(user)/tools/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Link from "next/link";
import BorrowRequestForm from "@/components/tools/BorrowRequestForm";

export default async function ToolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const toolRes = await db.execute({
    sql: `SELECT t.*,
            u.first_name || ' ' || u.last_name AS owner_name,
            u.username AS owner_username, u.profile_pic AS owner_pic,
            u.phone_number AS owner_phone, u.full_address AS owner_address
          FROM tools t JOIN users u ON u.id = t.owner_id
          WHERE t.id = ? AND t.approval_status = 'approved'`,
    args: [parseInt(id)],
  });

  if (!toolRes.rows.length) notFound();
  const tool = toolRes.rows[0] as {
    id: number; name: string; description: string; image_url: string | null;
    status: string; payment_method: string; fee: number; condition_note: string | null;
    service_type: string | null; landmark: string | null; borrow_count: number; created_at: string;
    owner_id: number; owner_name: string; owner_username: string; owner_pic: string | null;
    owner_phone: string; owner_address: string;
    known_issues?: string; // sealed — only shown after approval
  };

  // Check if user already has a pending/active request
  const existingRes = await db.execute({
    sql: "SELECT id, status FROM transactions WHERE tool_id=? AND borrower_id=? AND status IN ('pending','active')",
    args: [tool.id, session.id],
  });
  const existingTx = existingRes.rows[0] as { id: number; status: string } | undefined;

  const payBadge: Record<string, string> = {
    free:  "bg-green-100 text-green-700",
    cash:  "bg-yellow-100 text-yellow-700",
    gcash: "bg-blue-100 text-blue-700",
  };
  const condLabel: Record<string, string> = {
    new: "🌟 New", like_new: "✨ Like New", good: "👍 Good", fair: "⚠️ Fair", poor: "🔧 Needs Care",
  };
  const serviceLabel: Record<string, string> = {
    pickup: "📦 Pickup / Walk-in", delivery: "🚚 Delivery", both: "📦🚚 Pickup or Delivery",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-5 pt-14 md:pt-5 max-w-3xl space-y-5">

          {/* Back */}
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            ← Back to Find Tools
          </Link>

          {/* Image */}
          <div className="h-56 w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800">
            {tool.image_url
              ? <img src={tool.image_url} alt={tool.name} className="h-full w-full object-cover" />
              : <div className="h-full w-full flex items-center justify-center text-7xl text-gray-300 dark:text-slate-600">🔧</div>
            }
          </div>

          <div className="grid gap-5 md:grid-cols-5">
            {/* Left — Tool Info */}
            <div className="md:col-span-3 space-y-4">
              <div className="card">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">{tool.name}</h2>
                  <span className={`badge text-xs shrink-0 ${payBadge[tool.payment_method] ?? "bg-gray-100 text-gray-500"}`}>
                    {tool.payment_method === "free" ? "FREE" : tool.payment_method === "gcash" ? "GCash" : "Cash"}
                    {tool.fee > 0 && ` · ₱${tool.fee}/day`}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{tool.description || "No description provided."}</p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Condition</p>
                    <p className="font-medium text-gray-800 dark:text-slate-200">{condLabel[tool.condition_note ?? "good"] ?? tool.condition_note}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Service Type</p>
                    <p className="font-medium text-gray-800 dark:text-slate-200">{serviceLabel[tool.service_type ?? "pickup"] ?? tool.service_type}</p>
                  </div>
                  {tool.landmark && (
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Landmark</p>
                      <p className="font-medium text-gray-800 dark:text-slate-200">📍 {tool.landmark}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Status</p>
                    <span className={`badge text-xs ${tool.status === "available" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                      {tool.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Times Borrowed</p>
                    <p className="font-medium text-gray-800 dark:text-slate-200">{tool.borrow_count ?? 0}×</p>
                  </div>
                </div>
              </div>

              {/* Lender Info */}
              <div className="card">
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">Tool Owner</p>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-brand-100 dark:bg-brand-900/50">
                    {tool.owner_pic
                      ? <img src={`/${tool.owner_pic}`} alt="" className="h-full w-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center font-bold text-brand-700 dark:text-brand-300">{tool.owner_username[0].toUpperCase()}</div>
                    }
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{tool.owner_name}</p>
                    <p className="text-xs text-brand-600 dark:text-brand-400">@{tool.owner_username}</p>
                    {tool.owner_address && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">📍 {tool.owner_address}</p>
                    )}
                  </div>
                </div>
                <Link href={`/chat?with=${tool.owner_id}`}
                  className="btn-secondary mt-3 w-full text-sm text-center py-2">
                  💬 Message Owner
                </Link>
              </div>
            </div>

            {/* Right — Borrow Form */}
            <div className="md:col-span-2">
              {tool.owner_id === session.id ? (
                <div className="card text-center py-8 text-gray-400 dark:text-slate-500">
                  <p className="text-3xl mb-2">🔧</p>
                  <p className="text-sm font-medium">This is your tool listing.</p>
                  <Link href="/tools" className="btn-secondary mt-3 text-sm">Manage My Tools</Link>
                </div>
              ) : existingTx ? (
                <div className="card text-center py-8">
                  <p className="text-3xl mb-2">{existingTx.status === "pending" ? "⏳" : "✅"}</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {existingTx.status === "pending" ? "Request Pending" : "Currently Borrowing"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    {existingTx.status === "pending"
                      ? "Waiting for the owner to approve your request."
                      : "You're currently borrowing this tool."}
                  </p>
                  <Link href="/my-requests" className="btn-primary mt-3 text-sm">View My Requests</Link>
                </div>
              ) : tool.status !== "available" ? (
                <div className="card text-center py-8 text-gray-400 dark:text-slate-500">
                  <p className="text-3xl mb-2">🚫</p>
                  <p className="text-sm font-medium">This tool is currently unavailable.</p>
                </div>
              ) : (
                <BorrowRequestForm
                  toolId={tool.id}
                  toolName={tool.name}
                  paymentMethod={tool.payment_method}
                  fee={tool.fee}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
