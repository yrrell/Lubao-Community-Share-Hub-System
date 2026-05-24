// src/app/(user)/notifications/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Link from "next/link";

interface Notif {
  id: number;
  type: string;
  message: string;
  related_id: number | null;
  is_read: number;
  created_at: string;
}

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const notifsRes = await db.execute({
    sql: "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
    args: [session.id],
  });
  const notifs    = notifsRes.rows as unknown as Notif[];
  const unread    = notifs.filter((n) => !n.is_read).length;

  async function markAllRead() {
    "use server";
    await db.execute({ sql: "UPDATE notifications SET is_read=1 WHERE user_id=?", args: [session!.id] });
  }
  async function markRead(id: number) {
    "use server";
    await db.execute({ sql: "UPDATE notifications SET is_read=1 WHERE id=?", args: [id] });
  }

  const typeConfig: Record<string, { icon: string; color: string }> = {
    borrow_request: { icon: "📋", color: "border-brand-400" },
    success:        { icon: "✅", color: "border-green-400" },
    danger:         { icon: "⚠️", color: "border-red-400" },
    info:           { icon: "ℹ️", color: "border-blue-400" },
    system:         { icon: "🔔", color: "border-gray-400" },
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} unreadNotifs={unread} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-5 pt-14 md:pt-5 space-y-4 max-w-2xl">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
              {unread > 0 && (
                <p className="text-sm text-gray-500 dark:text-slate-400">{unread} unread</p>
              )}
            </div>
            {unread > 0 && (
              <form action={markAllRead}>
                <button className="btn-secondary text-xs px-3 py-1.5">✓ Mark all as read</button>
              </form>
            )}
          </div>

          {/* Notifications */}
          <div className="space-y-2">
            {notifs.map((n) => {
              const cfg = typeConfig[n.type] ?? typeConfig.system;
              return (
                <div key={n.id}
                  className={`card border-l-4 ${cfg.color} ${!n.is_read ? "bg-brand-50/50 dark:bg-brand-900/10" : ""} flex items-start gap-3`}>
                  <span className="text-xl shrink-0 mt-0.5">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.is_read ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-slate-300"}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.related_id && (
                      <Link href={`/my-requests`}
                        className="text-xs text-brand-600 dark:text-brand-400 hover:underline">View</Link>
                    )}
                    {!n.is_read && (
                      <form action={async () => { "use server"; await markRead(n.id); }}>
                        <button className="h-2 w-2 rounded-full bg-brand-500 hover:bg-brand-600 transition-colors" title="Mark as read" />
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
            {notifs.length === 0 && (
              <div className="card text-center py-12 text-gray-400 dark:text-slate-500">
                <p className="text-4xl mb-2">🔔</p>
                <p className="font-medium">No notifications yet.</p>
                <p className="text-sm mt-1">We&apos;ll notify you about borrow requests, tool approvals, and more.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
