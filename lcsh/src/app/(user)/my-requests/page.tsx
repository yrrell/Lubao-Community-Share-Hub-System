// src/app/(user)/my-requests/page.tsx
// FIXED: uses `borrows` + `items` tables (real schema)
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface BorrowRow {
  id: number;
  item_id: number;
  borrower_id: number;
  owner_id: number;
  status: string;
  borrow_date: string;
  due_date: string;
  created_at: string;
  tool_name: string;
  tool_image: string | null;
  borrower_username?: string;
  borrower_name?: string;
  borrower_email?: string;
}

const statusColor: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  approved:  "bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-400",
  active:    "bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-400",
  returned:  "bg-gray-100   text-gray-600   dark:bg-slate-800     dark:text-slate-400",
  cancelled: "bg-red-100    text-red-600    dark:bg-red-900/40    dark:text-red-400",
  overdue:   "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
};

export default async function MyRequestsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Pending borrow requests for items this user OWNS (lender view)
  const lenderRes = await db.execute({
    sql: `SELECT b.*, i.title AS tool_name, i.image_path AS tool_image,
                 u.username AS borrower_username,
                 u.first_name || ' ' || u.last_name AS borrower_name,
                 u.email AS borrower_email
          FROM borrows b
          JOIN items i ON b.item_id = i.id
          JOIN users u ON b.borrower_id = u.id
          WHERE b.owner_id = ? AND b.status = 'pending'
          ORDER BY b.created_at DESC`,
    args: [session.id],
  });
  const pendingRequests = lenderRes.rows.map(r => ({ ...r })) as unknown as BorrowRow[];

  // My borrow requests (borrower view)
  const borrowerRes = await db.execute({
    sql: `SELECT b.*, i.title AS tool_name, i.image_path AS tool_image
          FROM borrows b
          JOIN items i ON b.item_id = i.id
          WHERE b.borrower_id = ?
          ORDER BY b.created_at DESC LIMIT 20`,
    args: [session.id],
  });
  const myRequests = borrowerRes.rows.map(r => ({ ...r })) as unknown as BorrowRow[];

  // Badge counts
  const [notifRes, msgRes] = await Promise.all([
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0", args: [session.id] }),
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM messages WHERE receiver_id = ? AND is_read = 0", args: [session.id] }),
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar
        session={session}
        unreadNotifs={Number((notifRes.rows[0] as { cnt: number }).cnt)}
        unreadMessages={Number((msgRes.rows[0] as { cnt: number }).cnt)}
        pendingRequests={pendingRequests.length}
      />

      <div className="flex flex-col flex-1 min-w-0 md:ml-64">
        <Header />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-5 space-y-6">

            {/* Lender Tasks */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Lender Tasks</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                Requests from others who want to borrow your items
              </p>

              {pendingRequests.length === 0 ? (
                <div className="card text-center py-10 text-gray-400 dark:text-slate-500">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-sm">No pending requests right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((b) => (
                    <div key={b.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm text-gray-800 dark:text-slate-200">{b.tool_name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Requested by <strong>{b.borrower_name}</strong> (@{b.borrower_username})
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                          {new Date(b.borrow_date).toLocaleDateString("en-PH")} → {new Date(b.due_date).toLocaleDateString("en-PH")}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <form action={`/api/borrows/${b.id}`} method="POST">
                          <input type="hidden" name="action" value="approve" />
                          <button className="btn-primary text-xs px-3 py-1.5">Approve</button>
                        </form>
                        <form action={`/api/borrows/${b.id}`} method="POST">
                          <input type="hidden" name="action" value="decline" />
                          <button className="btn-secondary text-xs px-3 py-1.5 text-red-600 dark:text-red-400">Decline</button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Borrow Requests */}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">My Borrow Requests</h3>
              {myRequests.length === 0 ? (
                <div className="card text-center py-8 text-gray-400 dark:text-slate-500">
                  <p className="text-sm">You haven&apos;t made any borrow requests yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((b) => (
                    <div key={b.id} className="card flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm text-gray-800 dark:text-slate-200">{b.tool_name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {new Date(b.created_at).toLocaleDateString("en-PH")}
                        </p>
                      </div>
                      <span className={`badge ${statusColor[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
