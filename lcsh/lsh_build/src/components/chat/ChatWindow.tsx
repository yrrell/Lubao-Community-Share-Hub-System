"use client";
// src/components/chat/ChatWindow.tsx
import { useState, useRef, useEffect } from "react";
import { FiSend, FiArrowLeft } from "react-icons/fi";
import Link from "next/link";

interface Message {
  id: number;
  sender_id: number;
  body: string;
  is_read: number;
  created_at: string;
}

interface ChatWindowProps {
  sessionId: number;
  partnerId: number;
  partnerName: string;
  partnerUsername: string;
  partnerPic: string | null;
  initialMessages: Message[];
}

export default function ChatWindow({
  sessionId, partnerId, partnerName, partnerUsername, partnerPic, initialMessages,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody]         = useState("");
  const [sending, setSending]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 5s
  useEffect(() => {
    const interval = setInterval(async () => {
      const res  = await fetch(`/api/messages?with=${partnerId}`);
      const data = await res.json();
      if (data.data) setMessages(data.data);
    }, 5000);
    return () => clearInterval(interval);
  }, [partnerId]);

  async function handleSend() {
    if (!body.trim() || sending) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ receiver_id: partnerId, body: body.trim() }),
    });
    const data = await res.json();
    if (data.data) {
      setMessages((prev) => [...prev, data.data]);
      setBody("");
    }
    setSending(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Link href="/chat" className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500">
          <FiArrowLeft size={18} />
        </Link>
        <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900/50 overflow-hidden">
          {partnerPic
            ? <img src={`/${partnerPic}`} alt="" className="h-full w-full object-cover" />
            : <div className="h-full w-full flex items-center justify-center font-bold text-brand-700 dark:text-brand-300">
                {partnerUsername[0].toUpperCase()}
              </div>
          }
        </div>
        <div>
          <p className="font-bold text-sm text-gray-900 dark:text-white">{partnerName}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">@{partnerUsername}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === sessionId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                isMe
                  ? "bg-brand-600 dark:bg-brand-500 text-white rounded-br-sm"
                  : "bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-bl-sm border border-gray-100 dark:border-slate-700"
              }`}>
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                <p className={`text-[10px] mt-1 ${isMe ? "text-brand-200" : "text-gray-400 dark:text-slate-500"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {isMe && <span className="ml-1">{msg.is_read ? " ✓✓" : " ✓"}</span>}
                </p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500 text-sm">
            <span className="text-3xl mb-2">👋</span>
            <p>Say hello to @{partnerUsername}!</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="input flex-1 resize-none max-h-24 py-2.5"
            style={{ height: "auto" }}
          />
          <button onClick={handleSend} disabled={!body.trim() || sending}
            className="btn-primary h-10 w-10 p-0 shrink-0 rounded-full">
            <FiSend size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
