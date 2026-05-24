"use client";
// src/components/layout/Header.tsx
// UPDATED:
//   - Added "About" link (visible on mobile only, md:hidden) next to the toggle
//   - Color tokens unified: bg-white/dark:bg-slate-900, border-gray-100/dark:slate-800
//   - Desktop keeps About in the sidebar — header About is mobile-only
import Image from "next/image";
import Link from "next/link";
import { FiInfo } from "react-icons/fi";
import ThemeToggle from "@/components/ui/ThemeToggle";

interface HeaderProps {
  className?: string;
}

export default function Header({ className = "" }: HeaderProps) {
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
        {/* Logo container */}
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

        {/* App name */}
        <div className="leading-none">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500 leading-none">
            Lubao
          </p>
          <h1 className="text-sm font-black text-gray-900 dark:text-white leading-snug">
            Community Share Hub
          </h1>
        </div>
      </div>

      {/* ── Right: About (mobile only) + Theme toggle ───────────────── */}
      <div className="flex items-center gap-2">
        {/*
          About link — shown only on mobile (md:hidden).
          On desktop the sidebar already has an About link.
        */}
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

        {/* Theme toggle — always visible */}
        <ThemeToggle compact />
      </div>
    </header>
  );
}
