"use client";
// src/app/(user)/my-requests/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Link from "next/link";

interface TxRow {
  id: number;
  tool_name: string;
  tool_image: string | null;
  borrower_name: string;
  borrower_username: string;
  owner_name: string;
  owner_username: string;
  status: string;
  approval_status: string;
  payment_method: string;
  payment_ref: string | null;
  payment_screenshot: string | null;
  created_at: string;
  is_lender: boolean;
}

export default async function MyRequestsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [incomingRes, outgoingRes] = await Promise.all([
    // Lender view — tools I own that people want to borrow
    db.execute({
      sql: `SELECT t.*, tl.name AS tool_name, tl.image_url AS tool_image,
              u.first_name || ' ' || u.last_name AS borrower_name,
              u.username AS borrower_username,
              own.first_name || ' ' || own.last_name AS owner_name,
              own.username AS owner_username,
              1 AS is_lender
            FROM transactions t
            JOIN tools tl ON tl.id = t.tool_id
            JOIN users u  ON u.id  = t.borrower_id
            JOIN users own ON own.id = tl.owner_id
            WHERE tl.owner_id = ? AND t.borrower_id != ?
            ORDER BY t.created_at DESC`,
      args: [session.id, session.id],
    }),
    // Borrower view — my borrow requests
    db.execute({
      sql: `SELECT t.*, tl.name AS tool_name, tl.image_url AS tool_image,
              u.first_name || ' ' || u.last_name AS borrower_name,
              u.username AS borrower_username,
              own.first_name || ' ' || own.last_name AS owner_name,
              own.username AS owner_username,
              0 AS is_lender
            FROM transactions t
            JOIN tools tl ON tl.id = t.tool_id
            JOIN users u  ON u.id  = t.borrower_id
            JOIN users own ON own.id = tl.owner_id
            WHERE t.borrower_id = ?
            ORDER BY t.created_at DESC`,
      args: [session.id],
    }),
  ]);

  const incoming = incomingRes.rows as unknown as TxRow[];
  const outgoing = outgoingRes.rows as unknown as TxRow[];

  async function approveTx(id: number) {
    "use server";
    await db.execute({ sql: "UPDATE transactions SET approval_status='approved', status='active' WHERE id=?", args: [id] });
  }
  async function declineTx(id: number) {
    "use server";
    await db.execute({ sql: "UPDATE transactions SET approval_status='declined', status='cancelled' WHERE id=?", args: [id] });
  }
  async function markReturned(id: number) {
    "use server";
    await db.execute({ sql: "UPDATE transactions SET status='returned', updated_at=datetime('now') WHERE id=?", args: [id] });
  }

  const statusColors: Record<string, string> = {
    pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    active:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    returned:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    cancelled: "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400",
  };
  const statusLabels: Record<string, string> = {
    pending:   "Pending",
    active:    "Ready for Pickup",
    returned:  "Returned",
    cancelled: "Cancelled",
  };

  const TxCard = ({ tx, isLender }: { tx: TxRow; isLender: boolean }) => (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800">
          {tx.tool_image
            ? <img src={tx.tool_image} alt={tx.tool_name} className="h-full w-full object-cover" />
            : <div className="h-full w-full flex items-center justify-center text-2xl text-gray-300">🔧</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white">{tx.tool_name}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {isLender
              ? <>Borrower: <strong className="text-brand-600 dark:text-brand-400">@{tx.borrower_username}</strong></>
              : <>Owner: <strong className="text-brand-600 dark:text-brand-400">@{tx.owner_username}</strong></>
            }
          </p>
          <span className={`badge text-xs mt-1 ${statusColors[tx.status] ?? "bg-gray-100 text-gray-500"}`}>
            {statusLabels[tx.status] ?? tx.status}
          </span>
          <span className="ml-1.5 badge text-xs bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 uppercase">
            {tx.payment_method === "free" ? "FREE" : tx.payment_method}
          </span>
        </div>
      </div>

      {tx.payment_screenshot && (
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Payment Screenshot:</p>
          <img src={`/${tx.payment_screenshot}`} alt="Payment" className="h-24 rounded-xl object-cover" />
          {tx.payment_ref && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
              ✅ PAID ({tx.payment_ref})
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
        <Link href={`/agreement/${tx.id}`}
          className="btn-secondary text-xs flex-1 text-center py-1.5">
          📄 View Agreement
        </Link>

        {isLender && tx.status === "pending" && (
          <>
            <form action={async () => { "use server"; await approveTx(tx.id); }}>
              <button className="btn-primary text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700">
                ✓ Approve
              </button>
            </form>
            <form action={async () => { "use server"; await declineTx(tx.id); }}>
              <button className="btn-danger text-xs px-3 py-1.5">✕ Decline</button>
            </form>
          </>
        )}

        {isLender && tx.status === "active" && (
          <form action={async () => { "use server"; await markReturned(tx.id); }}>
            <button className="btn-primary text-xs px-3 py-1.5">✓ Mark Returned</button>
          </form>
        )}

        {!isLender && tx.status === "active" && (
          <Link href={`/agreement/${tx.id}`}
            className="btn-primary text-xs px-3 py-1.5 text-center">
            ✍ Sign PDF
          </Link>
        )}
      </div>
    </div>
  );

  const pendingIncoming = incoming.filter((t) => t.status === "pending").length;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} pendingRequests={pendingIncoming} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-5 pt-14 md:pt-5 space-y-6 max-w-4xl">

          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Transaction Manager</h2>
          </div>

          {/* Incoming — Lender Side */}
          <section>
            <h3 className="font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-2 mb-3">
              ✅ Borrower Requests (Incoming)
              {pendingIncoming > 0 && (
                <span className="badge bg-red-100 text-red-600 text-xs">{pendingIncoming}</span>
              )}
            </h3>
            {incoming.length === 0
              ? <div className="card text-center py-8 text-gray-400 dark:text-slate-500 text-sm">No incoming borrow requests yet.</div>
              : <div className="grid gap-3 sm:grid-cols-2">{incoming.map((tx) => <TxCard key={tx.id} tx={tx} isLender={true} />)}</div>
            }
          </section>

          {/* Outgoing — Borrower Side */}
          <section>
            <h3 className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-3">
              📤 My Borrowing Requests (Outgoing)
            </h3>
            {outgoing.length === 0
              ? <div className="card text-center py-8 text-gray-400 dark:text-slate-500 text-sm">You haven't borrowed anything yet.</div>
              : <div className="grid gap-3 sm:grid-cols-2">{outgoing.map((tx) => <TxCard key={tx.id} tx={tx} isLender={false} />)}</div>
            }
          </section>
        </div>
      </main>
    </div>
  );
}
