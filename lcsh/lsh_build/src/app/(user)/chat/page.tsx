"use client";
// src/app/(user)/chat/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import ChatWindow from "@/components/chat/ChatWindow";

interface ConvoRow {
  partner_id: number;
  partner_username: string;
  partner_name: string;
  partner_pic: string | null;
  last_message: string;
  last_time: string;
  unread_count: number;
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { with: withUser } = await searchParams;
  const partnerId = withUser ? parseInt(withUser) : null;

  // Get all unique conversations
  const convosRes = await db.execute({
    sql: `SELECT
        partner.id AS partner_id,
        partner.username AS partner_username,
        partner.first_name || ' ' || partner.last_name AS partner_name,
        partner.profile_pic AS partner_pic,
        latest.body AS last_message,
        latest.created_at AS last_time,
        (SELECT COUNT(*) FROM messages
         WHERE sender_id = partner.id AND receiver_id = ? AND is_read = 0) AS unread_count
      FROM (
        SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS pid,
               MAX(created_at) AS last_at
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY pid
      ) convs
      JOIN users partner ON partner.id = convs.pid
      JOIN messages latest ON (
        latest.created_at = convs.last_at AND
        (latest.sender_id = convs.pid OR latest.receiver_id = convs.pid)
      )
      ORDER BY convs.last_at DESC`,
    args: [session.id, session.id, session.id, session.id],
  });

  const convos = convosRes.rows as unknown as ConvoRow[];

  // Current conversation messages
  let messages: { id: number; sender_id: number; body: string; is_read: number; created_at: string }[] = [];
  let partner: ConvoRow | null = null;

  if (partnerId) {
    // Mark as read
    await db.execute({
      sql: "UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=?",
      args: [partnerId, session.id],
    });

    const msgsRes = await db.execute({
      sql: `SELECT * FROM messages
            WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)
            ORDER BY created_at ASC LIMIT 100`,
      args: [session.id, partnerId, partnerId, session.id],
    });
    messages = msgsRes.rows as unknown as typeof messages;
    partner  = convos.find((c) => c.partner_id === partnerId) ?? null;
  }

  const totalUnread = convos.reduce((s, c) => s + Number(c.unread_count), 0);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} unreadMessages={totalUnread} />

      <main className="flex-1 overflow-hidden flex">
        {/* Conversations List */}
        <div className={`w-full md:w-72 shrink-0 border-r border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col ${partnerId ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-gray-100 dark:border-slate-800">
            <h2 className="font-bold text-gray-900 dark:text-white">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800">
            {convos.map((c) => (
              <a key={c.partner_id} href={`/chat?with=${c.partner_id}`}
                className={`flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
                  partnerId === c.partner_id ? "bg-brand-50 dark:bg-slate-800" : ""
                }`}>
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900/50 overflow-hidden">
                    {c.partner_pic
                      ? <img src={`/${c.partner_pic}`} alt="" className="h-full w-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold">{c.partner_username[0].toUpperCase()}</div>
                    }
                  </div>
                  {c.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {c.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">@{c.partner_username}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{c.last_message}</p>
                </div>
                <p className="text-[10px] text-gray-300 dark:text-slate-600 shrink-0">
                  {new Date(c.last_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </a>
            ))}
            {convos.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-slate-500 text-sm p-4 text-center">
                <span className="text-3xl mb-2">💬</span>
                No messages yet. Start a conversation from a tool listing!
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        {partnerId && partner ? (
          <ChatWindow
            sessionId={session.id}
            partnerId={partnerId}
            partnerName={partner.partner_name}
            partnerUsername={partner.partner_username}
            partnerPic={partner.partner_pic}
            initialMessages={messages}
          />
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-3 text-gray-400 dark:text-slate-500">
            <span className="text-5xl">💬</span>
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">Choose a contact from the left to start chatting.</p>
          </div>
        )}
      </main>
    </div>
  );
}
