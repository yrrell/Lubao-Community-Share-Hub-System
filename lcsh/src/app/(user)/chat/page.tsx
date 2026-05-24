// src/app/(user)/chat/page.tsx
// NEW PAGE: was returning 404. Basic inbox using real `messages` schema.
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface Thread {
  other_id: number;
  other_username: string;
  other_name: string;
  last_message: string;
  last_at: string;
  unread: number;
}

export default async function ChatPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Get latest message per conversation partner
  const threadsRes = await db.execute({
    sql: `SELECT
            CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS other_id,
            u.username AS other_username,
            u.first_name || ' ' || u.last_name AS other_name,
            m.body AS last_message,
            m.created_at AS last_at,
            SUM(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 ELSE 0 END) AS unread
          FROM messages m
          JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
          WHERE m.sender_id = ? OR m.receiver_id = ?
          GROUP BY other_id
          ORDER BY last_at DESC`,
    args: [session.id, session.id, session.id, session.id, session.id],
  });
  const threads = threadsRes.rows.map(r => ({ ...r })) as unknown as Thread[];

  const [notifRes, pendRes] = await Promise.all([
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0", args: [session.id] }),
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM borrows WHERE owner_id = ? AND status = 'pending'", args: [session.id] }),
  ]);
  const unreadMessages = threads.reduce((s, t) => s + Number(t.unread), 0);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar
        session={session}
        unreadNotifs={Number((notifRes.rows[0] as { cnt: number }).cnt)}
        unreadMessages={unreadMessages}
        pendingRequests={Number((pendRes.rows[0] as { cnt: number }).cnt)}
      />

      <div className="flex flex-col flex-1 min-w-0 md:ml-64">
        <Header />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-5">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Your conversations</p>
            </div>

            {threads.length === 0 ? (
              <div className="card text-center py-16 text-gray-400 dark:text-slate-500">
                <p className="text-4xl mb-3">💬</p>
                <p className="font-medium">No messages yet.</p>
                <p className="text-sm mt-1">Start a conversation by requesting to borrow an item.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {threads.map((t) => (
                  <div
                    key={t.other_id}
                    className={`card flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow ${
                      t.unread > 0 ? "border-brand-200 dark:border-brand-800" : ""
                    }`}
                  >
                    {/* Avatar */}
                    <div className="h-10 w-10 shrink-0 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-700 dark:text-brand-300 font-black text-sm">
                      {String(t.other_username)[0]?.toUpperCase() ?? "?"}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {t.other_name}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 shrink-0 ml-2">
                          {new Date(t.last_at).toLocaleDateString("en-PH")}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{t.last_message}</p>
                    </div>

                    {/* Unread badge */}
                    {t.unread > 0 && (
                      <span className="badge bg-brand-500 text-white text-[10px] shrink-0">
                        {t.unread}
                      </span>
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
