// src/app/(user)/agreement/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";

export default async function AgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const res = await db.execute({
    sql: `SELECT t.*,
            tl.name AS tool_name, tl.description AS tool_desc, tl.image_url AS tool_image,
            tl.fee AS tool_fee,
            b.first_name || ' ' || b.last_name AS borrower_name,
            b.username AS borrower_username, b.profile_pic AS borrower_pic,
            b.full_address AS borrower_address,
            o.first_name || ' ' || o.last_name AS owner_name,
            o.username AS owner_username, o.profile_pic AS owner_pic,
            o.phone_number AS owner_phone, o.full_address AS owner_address
          FROM transactions t
          JOIN tools tl ON tl.id = t.tool_id
          JOIN users b  ON b.id  = t.borrower_id
          JOIN users o  ON o.id  = tl.owner_id
          WHERE t.id = ?`,
    args: [parseInt(id)],
  });

  if (!res.rows.length) notFound();

  const tx = res.rows[0] as {
    id: number; tool_name: string; tool_desc: string; tool_image: string | null; tool_fee: number;
    borrower_id: number; borrower_name: string; borrower_username: string; borrower_pic: string | null; borrower_address: string;
    owner_id: number; owner_name: string; owner_username: string; owner_pic: string | null; owner_phone: string; owner_address: string;
    status: string; payment_method: string; payment_ref: string | null; payment_screenshot: string | null;
    created_at: string; updated_at: string;
  };

  // Access control
  if (session.role !== "admin" && tx.borrower_id !== session.id && tx.owner_id !== session.id) {
    redirect("/dashboard");
  }

  const statusLabel: Record<string, string> = {
    pending: "⏳ Pending Approval",
    active:  "✅ Active — Ready for Pickup",
    returned: "📦 Returned",
    cancelled: "❌ Cancelled",
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 p-4 print:p-0 print:bg-white">
      {/* Toolbar — hidden on print */}
      <div className="flex justify-between items-center mb-4 print:hidden">
        <Link href="/my-requests" className="btn-secondary text-sm">← Back</Link>
        <button onClick={() => window.print()} className="btn-primary text-sm">🖨 Print / Save PDF</button>
      </div>

      {/* Agreement Card */}
      <div className="bg-white dark:bg-slate-900 max-w-2xl mx-auto rounded-2xl shadow-xl p-8 print:shadow-none print:rounded-none print:max-w-full">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">BORROWING AGREEMENT</h1>
          <div className="mt-1 inline-block rounded-full bg-gray-100 dark:bg-slate-800 px-3 py-0.5 text-xs font-bold text-gray-600 dark:text-slate-400">
            ID: #{tx.id}
          </div>
        </div>

        {/* Parties */}
        <div className="flex items-start justify-between gap-6 mb-6">
          {/* Borrower */}
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full overflow-hidden bg-brand-100 dark:bg-brand-900/50 shrink-0">
              {tx.borrower_pic
                ? <img src={`/${tx.borrower_pic}`} alt="" className="h-full w-full object-cover" />
                : <div className="h-full w-full flex items-center justify-center text-xl font-black text-brand-700 dark:text-brand-300">{tx.borrower_name[0]}</div>
              }
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">Borrower</p>
              <p className="font-bold text-gray-900 dark:text-white">{tx.borrower_name}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Brgy. {tx.borrower_address?.split(",")[1]?.trim() ?? "Lubao"}</p>
            </div>
          </div>

          {/* Lender */}
          <div className="flex items-center gap-3 flex-row-reverse text-right">
            <div className="h-14 w-14 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
              {tx.owner_pic
                ? <img src={`/${tx.owner_pic}`} alt="" className="h-full w-full object-cover" />
                : <div className="h-full w-full flex items-center justify-center text-xl font-black text-gray-500 dark:text-slate-400">{tx.owner_name[0]}</div>
              }
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Lender</p>
              <p className="font-bold text-gray-900 dark:text-white">{tx.owner_name}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Contact: {tx.owner_phone ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-slate-700 my-4" />

        {/* Tool Table */}
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700">
              <th className="text-left py-2 font-semibold text-gray-600 dark:text-slate-400">Item Name</th>
              <th className="text-left py-2 font-semibold text-gray-600 dark:text-slate-400">Fee</th>
              <th className="text-left py-2 font-semibold text-gray-600 dark:text-slate-400">Payment Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-3 font-medium text-gray-900 dark:text-white">{tx.tool_name}</td>
              <td className="py-3 text-gray-700 dark:text-slate-300">
                {tx.payment_method === "free" ? "FREE" : `₱${tx.tool_fee?.toFixed(2) ?? "0.00"}`}
              </td>
              <td className="py-3">
                {tx.payment_ref
                  ? <span className="font-bold text-green-600 dark:text-green-400">PAID ({tx.payment_ref})</span>
                  : <span className="text-gray-400 dark:text-slate-500">—</span>
                }
              </td>
            </tr>
          </tbody>
        </table>

        {/* Status */}
        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 p-3 text-sm text-gray-600 dark:text-slate-400 mb-4">
          <strong>Status:</strong> {statusLabel[tx.status] ?? tx.status}
        </div>

        {/* Screenshot */}
        {tx.payment_screenshot && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Payment Screenshot</p>
            <img src={`/${tx.payment_screenshot}`} alt="Payment proof" className="h-32 rounded-xl object-cover border border-gray-200 dark:border-slate-700" />
          </div>
        )}

        {/* Signature Area */}
        <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
          {tx.status === "active" ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="h-16 border-b-2 border-gray-300 dark:border-slate-600 mb-1" />
                <p className="text-xs text-gray-500 dark:text-slate-400">Borrower&apos;s Signature</p>
                <p className="text-xs font-medium text-gray-700 dark:text-slate-300">{tx.borrower_name}</p>
              </div>
              <div>
                <div className="h-16 border-b-2 border-gray-300 dark:border-slate-600 mb-1" />
                <p className="text-xs text-gray-500 dark:text-slate-400">Lender&apos;s Signature</p>
                <p className="text-xs font-medium text-gray-700 dark:text-slate-300">{tx.owner_name}</p>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-400 dark:text-slate-500 italic">
              {tx.status === "pending"
                ? "Awaiting Lender's approval…"
                : tx.status === "returned"
                ? "Transaction completed. ✅"
                : "Transaction cancelled."}
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-300 dark:text-slate-600 mt-6">
          Lubao Community Share Hub · Generated {new Date(tx.created_at).toLocaleString()} · Agreement #{tx.id}
        </p>
      </div>
    </div>
  );
}
