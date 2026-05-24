// src/app/(user)/dashboard/page.tsx
// FIXED: uses `items` table (not `tools`), `borrows` (not `transactions`)
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import type { SessionUser } from "@/types";

// Item row returned from the DB (schema-aligned)
interface Item {
  id: number;
  title: string;
  description: string | null;
  condition: string;
  borrow_type: string;
  fee_per_day: number;
  location: string | null;
  image_path: string | null;
  is_available: number;
  owner_id: number;
  owner_username: string;
  owner_name: string;
}

function ItemCard({ item, session }: { item: Item; session: SessionUser }) {
  const isOwner = item.owner_id === session.id;
  const conditionColor: Record<string, string> = {
    new:      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    like_new: "bg-teal-100  text-teal-700  dark:bg-teal-900/40  dark:text-teal-400",
    good:     "bg-blue-100  text-blue-700  dark:bg-blue-900/40  dark:text-blue-400",
    fair:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    poor:     "bg-red-100   text-red-700   dark:bg-red-900/40   dark:text-red-400",
  };

  return (
    <div className="card flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="h-40 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
        {item.image_path ? (
          <img src={item.image_path} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl">🔧</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1">
        <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.title}</h3>
        {item.description && (
          <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 mt-0.5">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`badge text-[10px] ${conditionColor[item.condition] ?? "bg-gray-100 text-gray-600"}`}>
            {item.condition.replace("_", " ")}
          </span>
          <span className="badge bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 text-[10px]">
            {item.borrow_type === "free" ? "Free" : item.borrow_type === "fee_based" ? `₱${item.fee_per_day}/day` : "Donation"}
          </span>
        </div>
        {item.location && (
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">📍 {item.location}</p>
        )}
        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">by @{item.owner_username}</p>
      </div>

      {/* Action */}
      {!isOwner && (
        <a
          href={`/borrow/${item.id}`}
          className="btn-primary w-full text-xs py-2"
        >
          Request to Borrow
        </a>
      )}
      {isOwner && (
        <span className="text-center text-xs text-gray-400 dark:text-slate-500 py-1">Your item</span>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "admin") redirect("/admin/dashboard");

  // FIXED: query `items` table (real schema)
  const itemsRes = await db.execute({
    sql: `SELECT i.*, u.username AS owner_username,
                 u.first_name || ' ' || u.last_name AS owner_name
          FROM items i
          JOIN users u ON i.owner_id = u.id
          WHERE i.is_available = 1 AND i.is_active = 1
          ORDER BY i.created_at DESC`,
    args: [],
  });
  const items = itemsRes.rows.map(r => ({ ...r })) as unknown as Item[];

  // Badge counts
  const [notifRes, msgRes, pendRes] = await Promise.all([
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0", args: [session.id] }),
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM messages WHERE receiver_id = ? AND is_read = 0",  args: [session.id] }),
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM borrows WHERE owner_id = ? AND status = 'pending'", args: [session.id] }),
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar
        session={session}
        unreadNotifs={Number((notifRes.rows[0] as { cnt: number }).cnt)}
        unreadMessages={Number((msgRes.rows[0] as { cnt: number }).cnt)}
        pendingRequests={Number((pendRes.rows[0] as { cnt: number }).cnt)}
      />

      <div className="flex flex-col flex-1 min-w-0 md:ml-64">
        {/* Header */}
        <Header />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-5">
            <div className="mb-6">
              <h2 className="text-xl font-black text-gray-900 dark:text-white font-display">Find Items</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Browse available items in your community</p>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-slate-600">
                <div className="text-5xl mb-4">📦</div>
                <p className="font-medium">No items available right now.</p>
                <p className="text-sm mt-1">Be the first to post one!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <ItemCard key={item.id} item={item} session={session} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
