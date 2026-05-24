"use client";
// src/app/about/page.tsx
import Image from "next/image";
import Link from "next/link";
import { FiArrowLeft, FiMail, FiFacebook, FiGlobe, FiGithub, FiCheck } from "react-icons/fi";
import ThemeToggle from "@/components/ui/ThemeToggle";

const FEATURES = [
  {
    icon: "🔧",
    label: "Tool Lending",
    tag: "CORE",
    tagColor: "bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300",
    desc: "Borrow and lend community tools. Post your tools for neighbors to borrow with approval-based requests.",
  },
  {
    icon: "👤",
    label: "User Verification",
    tag: "CORE",
    tagColor: "bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300",
    desc: "Admin verifies each user's government ID before granting platform access, ensuring community safety.",
  },
  {
    icon: "💳",
    label: "GCash Anti-Scam",
    tag: "CORE",
    tagColor: "bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300",
    desc: "GCash reference ID cross-check system prevents fraudulent approvals and protects both parties.",
  },
  {
    icon: "🔔",
    label: "Notifications",
    tag: "CORE",
    tagColor: "bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300",
    desc: "Real-time in-app alerts and automated Gmail email notifications for all key events.",
  },
  {
    icon: "💬",
    label: "Messaging",
    tag: "CORE",
    tagColor: "bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300",
    desc: "Direct messaging between users to coordinate tool pickup, condition, and return.",
  },
  {
    icon: "🛡️",
    label: "Admin Panel",
    tag: "CORE",
    tagColor: "bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300",
    desc: "Full admin dashboard for user management, tool moderation, reports, and security logs.",
  },
  {
    icon: "🌙",
    label: "Dark / Light Mode",
    tag: "UI",
    tagColor: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    desc: "Switch between dark and light themes — your preference is saved automatically across sessions.",
  },
  {
    icon: "📱",
    label: "Mobile First",
    tag: "UI",
    tagColor: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    desc: "Designed for mobile browsers with a fixed viewport and touch-friendly collapsible sidebar.",
  },
];

const TECH = [
  { name: "Next.js 15", role: "Framework" },
  { name: "TypeScript", role: "Language" },
  { name: "Tailwind CSS", role: "Styling" },
  { name: "Turso / libSQL", role: "Database" },
  { name: "Vercel", role: "Hosting" },
  { name: "Nodemailer", role: "Email" },
];

const VERSION_HISTORY = [
  {
    version: "v2.0.0",
    date: "May 2026",
    current: true,
    changes: [
      "Complete architecture rewrite to Next.js + TypeScript",
      "Turso (cloud SQLite) database migration from MySQL",
      "JWT-based authentication replacing PHP sessions",
      "Dark / Light theme system with localStorage persistence",
      "Professional loading screen with animated progress",
      "About page with developer profile",
      "Mobile-first responsive design with fixed viewport",
      "REST JSON API replacing PHP scripts",
    ],
  },
  {
    version: "v1.0.0",
    date: "Apr 2026",
    current: false,
    changes: [
      "PHP + MySQL initial release",
      "User registration with gov ID verification",
      "Tool posting and borrow request system",
      "GCash anti-scam reference check",
      "PHPMailer email notifications",
      "Basic admin panel",
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">

      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          <FiArrowLeft size={16} />
          Back
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">

        {/* ── Hero Card ────────────────────────────── */}
        <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-sm">
          {/* Logo */}
          <div className="relative mx-auto mb-4 h-24 w-24">
            <div className="absolute inset-0 rounded-2xl bg-brand-500/20 blur-xl" />
            <div className="relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center shadow-md">
              <Image
                src="/assets/images/logo/lsh-logo.png"
                alt="LSH Logo"
                width={80}
                height={80}
                className="object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="absolute text-4xl font-black text-brand-600 dark:text-brand-400 select-none">L</span>
            </div>
          </div>

          <h1 className="text-xl font-black text-gray-900 dark:text-white font-display">Lubao Community Share Hub</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Tool Lending & Community Platform</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
            VERSION 2.0.0
          </span>
        </div>

        {/* ── About ─────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">About This App</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
            Lubao Community Share Hub is a modern, community-driven tool-lending platform built for the residents of{" "}
            <strong className="text-gray-800 dark:text-white">Lubao, Pampanga</strong>. It connects neighbors who need tools with
            those who have them to spare — promoting a culture of sharing, reducing waste, and strengthening community bonds.
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
            Deployed on Vercel with a Turso cloud database — no installation required.
            Access from any browser, anywhere.
          </p>
        </section>

        {/* ── Features ──────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">Features</h2>
          <div className="space-y-4">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex gap-3">
                <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-gray-800 dark:text-slate-100">{f.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${f.tagColor}`}>
                      {f.tag}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Built With ───────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">Built With</h2>
          <div className="grid grid-cols-2 gap-2">
            {TECH.map((t) => (
              <div key={t.name} className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2.5">
                <FiCheck size={12} className="text-brand-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-slate-100">{t.name}</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Developer ─────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">Developer</h2>
          <div className="flex items-center gap-4">
            {/* Dev photo */}
            <div className="relative h-16 w-16 shrink-0">
              <div className="absolute inset-0 rounded-xl bg-brand-500/20 blur-md" />
              <div className="relative h-16 w-16 rounded-xl overflow-hidden border-2 border-brand-200 dark:border-brand-800 bg-gray-100 dark:bg-slate-700">
                <Image
                  src="/assets/images/developer_image/developer.png"
                  alt="Developer Photo"
                  fill
                  className="object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </div>
            <div>
              <h3 className="font-black text-gray-900 dark:text-white text-sm">John Lerry V. Teodoro</h3>
              <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-0.5">Full-Stack Developer</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">jlerryteodoro@gmail.com</p>
            </div>
          </div>
        </section>

        {/* ── Connect ───────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">Connect</h2>
          <div className="space-y-2">
            {[
              { icon: FiMail,     label: "Email",     value: "jlerryteodoro@gmail.com",    href: "mailto:jlerryteodoro@gmail.com" },
              { icon: FiFacebook, label: "Facebook",  value: "JLerry Vitug Teodoro",       href: "#" },
              { icon: FiGithub,   label: "GitHub",    value: "github.com/yrrell",          href: "https://github.com/yrrell" },
              { icon: FiGlobe,    label: "Web App",   value: "Vercel Deployment",          href: "#" },
            ].map((c) => (
              <a key={c.label} href={c.href}
                className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 py-3 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all group">
                <c.icon size={15} className="text-brand-500 group-hover:text-brand-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-slate-100">{c.label}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{c.value}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── Version History ───────────────────────── */}
        <section className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">Version History</h2>
          <div className="space-y-5">
            {VERSION_HISTORY.map((v) => (
              <div key={v.version}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-black text-sm text-gray-900 dark:text-white">{v.version}</span>
                  {v.current && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 dark:bg-brand-900/50 px-2 py-0.5 text-[10px] font-black uppercase text-brand-700 dark:text-brand-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                      CURRENT
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">{v.date}</span>
                </div>
                <ul className="space-y-1.5 pl-1">
                  {v.changes.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400">
                      <span className="text-brand-500 mt-0.5 shrink-0">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom nav */}
        <div className="pb-6 text-center">
          <Link href="/login" className="btn-primary inline-flex">
            <FiArrowLeft size={15} />
            Back to Login
          </Link>
          <p className="mt-4 text-xs text-gray-400 dark:text-slate-600">
            © 2025–2026 Lubao Community Share Hub · All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
