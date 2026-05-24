"use client";
// ============================================================
// src/components/layout/Header.tsx
// UPDATED:
//   - Added Logout button visible on mobile only (md:hidden)
//   - Logout removed from BottomNav to prevent duplicate UI
//   - About link retained for mobile
// ============================================================
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FiInfo, FiLogOut } from "react-icons/fi";
import ThemeToggle from "@/components/ui/ThemeToggle";
import type { SessionUser } from "@/types";

interface HeaderProps {
  className?: string;
  session?:   SessionUser;  // optional — only needed for logout button
}

export default function Header({ className = "", session }: HeaderProps) {
  const router              = useRouter();
  const [loggingOut, setOut] = useState(false);

  async function handleLogout() {
    setOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out.");
    router.push("/login");
  }

  return (
    <header
      className={`
        sticky top-0 z-20 flex items-center justify-between
        h-14 px-4 md:px-6
        bg-white dark:bg-slate-900
        border-b border-gray-100 dark:border-slate-800
        shadow-sm
        ${className}
      `}
    >
      {/* ── Left: Logo + Title ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl
                        bg-white dark:bg-slate-800
                        border border-gray-100 dark:border-slate-700
                        flex items-center justify-center shadow-sm">
          <Image
            src="/assets/images/logo/lsh-logo.png"
            alt="LSH Logo"
            width={36}
            height={36}
            className="object-contain"
            priority
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        <div className="leading-none">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500 leading-none">
            Lubao
          </p>
          <h1 className="text-sm font-black text-gray-900 dark:text-white leading-snug">
            Community Share Hub
          </h1>
        </div>
      </div>

      {/* ── Right: About + Logout (mobile only) + Theme toggle ─────── */}
      <div className="flex items-center gap-2">

        {/* About — mobile only (desktop has it in the sidebar) */}
        <Link
          href="/about"
          className="
            md:hidden
            inline-flex items-center gap-1.5
            rounded-xl border border-gray-100 dark:border-slate-700
            bg-gray-50 dark:bg-slate-800
            px-3 py-2
            text-xs font-semibold
            text-gray-600 dark:text-slate-300
            hover:bg-gray-100 dark:hover:bg-slate-700
            transition-colors duration-150
          "
          aria-label="About"
        >
          <FiInfo size={14} />
          <span>About</span>
        </Link>

        {/* Logout — mobile only. Shown only when a session is passed in.
            Desktop logout lives in the Sidebar footer. */}
        {session && (
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Logout"
            className="
              md:hidden
              inline-flex items-center gap-1.5
              rounded-xl border border-red-100 dark:border-red-900/40
              bg-red-50 dark:bg-red-900/20
              px-3 py-2
              text-xs font-semibold
              text-red-600 dark:text-red-400
              hover:bg-red-100 dark:hover:bg-red-900/40
              transition-colors duration-150
              disabled:opacity-50
            "
          >
            <FiLogOut size={14} />
            <span>{loggingOut ? "…" : "Logout"}</span>
          </button>
        )}

        {/* Theme toggle — always visible */}
        <ThemeToggle compact />
      </div>
    </header>
  );
}
