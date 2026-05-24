// src/app/(user)/notifications/page.tsx
// NEW PAGE: was returning 404. Uses real `notifications` schema (title + body).
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface Notif {
  id: number;
  type: string;
  title: string;
  body: string | null;
  is_read: number;
  link: string | null;
  created_at: string;
}

const typeStyle: Record<string, string> = {
  success:       "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  danger:        "bg-red-100   text-red-700   dark:bg-red-900/40   dark:text-red-400",
  info:          "bg-blue-100  text-blue-700  dark:bg-blue-900/40  dark:text-blue-400",
  system:        "bg-gray-100  text-gray-600  dark:bg-slate-800    dark:text-slate-400",
  borrow_request:"bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400",
};

const typeIcon: Record<string, string> = {
  success: "✅", danger: "⚠️", info: "ℹ️", system: "🔔", borrow_request: "📦",
};

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const notifsRes = await db.execute({
    sql: `SELECT id, type, title, body, is_read, link, created_at
          FROM notifications
          WHERE user_id = ?
          ORDER BY created_at DESC LIMIT 50`,
    args: [session.id],
  });
  const notifs = notifsRes.rows.map(r => ({ ...r })) as unknown as Notif[];

  const unreadCount = notifs.filter(n => n.is_read === 0).length;

  const [msgRes, pendRes] = await Promise.all([
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM messages WHERE receiver_id = ? AND is_read = 0", args: [session.id] }),
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM borrows WHERE owner_id = ? AND status = 'pending'", args: [session.id] }),
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar
        session={session}
        unreadNotifs={unreadCount}
        unreadMessages={Number((msgRes.rows[0] as { cnt: number }).cnt)}
        pendingRequests={Number((pendRes.rows[0] as { cnt: number }).cnt)}
      />

      <div className="flex flex-col flex-1 min-w-0 md:ml-64">
        <Header />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
                </p>
              </div>
            </div>

            {notifs.length === 0 ? (
              <div className="card text-center py-16 text-gray-400 dark:text-slate-500">
                <p className="text-4xl mb-3">🔔</p>
                <p className="font-medium">No notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifs.map((n) => (
                  <div
                    key={n.id}
                    className={`card flex gap-3 items-start transition-all ${
                      n.is_read === 0
                        ? "border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/10"
                        : ""
                    }`}
                  >
                    {/* Icon */}
                    <span className="text-xl shrink-0 mt-0.5">
                      {typeIcon[n.type] ?? "🔔"}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{n.title}</p>
                        <span className={`badge shrink-0 text-[10px] ${typeStyle[n.type] ?? typeStyle.system}`}>
                          {n.type.replace("_", " ")}
                        </span>
                      </div>
                      {n.body && (
                        <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5 leading-relaxed">{n.body}</p>
                      )}
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                        {new Date(n.created_at).toLocaleString("en-PH")}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {n.is_read === 0 && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
