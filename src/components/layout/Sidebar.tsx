"use client";
// ============================================================
// src/components/layout/Sidebar.tsx
// UPDATED:
//   - Mobile BottomNav: Logout REMOVED (now in Header for mobile)
//   - Desktop sidebar: Logout stays in footer (UNCHANGED)
//   - Report added to userBottomNav for quick access
// ============================================================
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
  FiSearch, FiMessageSquare, FiBell, FiList,
  FiUser, FiTool, FiLogOut,
  FiHome, FiUsers, FiFlag, FiInfo, FiAlertTriangle,
} from "react-icons/fi";
import type { SessionUser } from "@/types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface SidebarProps {
  session:          SessionUser;
  unreadNotifs?:    number;
  unreadMessages?:  number;
  pendingRequests?: number;
}

// ── Desktop sidebar links ──────────────────────────────────────────────────────
const userLinks = [
  { href: "/dashboard",      label: "Find Items",    icon: FiSearch },
  { href: "/chat",           label: "Messages",      icon: FiMessageSquare, badge: "messages" },
  { href: "/notifications",  label: "Notifications", icon: FiBell,          badge: "notifs" },
  { href: "/my-requests",    label: "Lender Tasks",  icon: FiList,          badge: "pending" },
  { href: "/tools",          label: "Post an Item",  icon: FiTool },
  { href: "/profile",        label: "Profile",       icon: FiUser },
  { href: "/report",         label: "File a Report", icon: FiAlertTriangle },
  { href: "/about",          label: "About",         icon: FiInfo },
];

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard",        icon: FiHome },
  { href: "/admin/tools",     label: "Item Inventory",   icon: FiTool },
  { href: "/admin/users",     label: "User Management",  icon: FiUsers },
  { href: "/admin/reports",   label: "Reports",          icon: FiFlag },
  { href: "/about",           label: "About",            icon: FiInfo },
];

// ── Mobile bottom nav ─────────────────────────────────────────────────────────
// Logout is intentionally ABSENT here — it now lives in the Header (mobile only).
// This keeps the bottom nav uncluttered and avoids duplicate logout controls.
const userBottomNav = [
  { href: "/dashboard",     label: "Explore",   icon: FiSearch },
  { href: "/tools",         label: "Post",      icon: FiTool },
  { href: "/chat",          label: "Messages",  icon: FiMessageSquare, badge: "messages" },
  { href: "/notifications", label: "Alerts",    icon: FiBell,          badge: "notifs" },
  { href: "/my-requests",   label: "Requests",  icon: FiList,          badge: "pending" },
  { href: "/report",        label: "Report",    icon: FiAlertTriangle },
  { href: "/profile",       label: "Profile",   icon: FiUser },
];

const adminBottomNav = [
  { href: "/admin/dashboard", label: "Home",    icon: FiHome },
  { href: "/admin/tools",     label: "Items",   icon: FiTool },
  { href: "/admin/users",     label: "Users",   icon: FiUsers },
  { href: "/admin/reports",   label: "Reports", icon: FiFlag },
];

// ── Shared color tokens ───────────────────────────────────────────────────────
const NAV_BG       = "bg-white dark:bg-slate-900";
const NAV_BORDER   = "border-gray-100 dark:border-slate-800";
const NAV_ACTIVE   = "text-brand-600 dark:text-brand-400";
const NAV_INACTIVE = "text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300";

export default function Sidebar({
  session,
  unreadNotifs    = 0,
  unreadMessages  = 0,
  pendingRequests = 0,
}: SidebarProps) {
  const pathname             = usePathname();
  const router               = useRouter();
  const [loggingOut, setOut] = useState(false);

  const links     = session.role === "admin" ? adminLinks     : userLinks;
  const bottomNav = session.role === "admin" ? adminBottomNav : userBottomNav;

  async function handleLogout() {
    setOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out.");
    router.push("/login");
  }

  function getBadge(badge?: string) {
    if (badge === "messages" && unreadMessages  > 0) return unreadMessages;
    if (badge === "notifs"   && unreadNotifs    > 0) return unreadNotifs;
    if (badge === "pending"  && pendingRequests > 0) return pendingRequests;
    return 0;
  }

  // ── Desktop sidebar (hidden on mobile) ────────────────────────────────────
  const DesktopSidebar = (
    <aside className={`hidden md:flex fixed left-0 top-0 z-30 h-full w-64 flex-col
                       ${NAV_BG} border-r ${NAV_BORDER} shadow-sm`}>

      {/* Brand */}
      <div className={`border-b ${NAV_BORDER} p-5`}>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">Lubao</p>
        <h1 className="text-sm font-black text-gray-900 dark:text-white leading-tight">
          Community Share Hub
        </h1>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {links.map((link) => {
          const active = pathname === link.href;
          const count  = getBadge((link as { badge?: string }).badge);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link ${active ? "active" : ""} flex items-center justify-between`}
            >
              <span className="flex items-center gap-3">
                <link.icon size={16} />
                {link.label}
              </span>
              {count > 0 && (
                <span className="badge bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-[10px]">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: theme toggle + user chip + logout (desktop only) */}
      <div className={`border-t ${NAV_BORDER} p-4 space-y-3`}>
        <ThemeToggle className="w-full justify-between" />

        <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full
                          bg-brand-100 dark:bg-brand-900/50
                          text-brand-700 dark:text-brand-300 text-sm font-black">
            {session.username[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-800 dark:text-slate-100">
              @{session.username}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">{session.role}</p>
          </div>
        </div>

        {/* Logout button — desktop sidebar footer only */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="btn-secondary w-full text-red-600 dark:text-red-400
                     hover:bg-red-50 dark:hover:bg-red-900/20
                     border-red-100 dark:border-red-900/40"
        >
          <FiLogOut size={15} />
          {loggingOut ? "Logging out…" : "Logout"}
        </button>
      </div>
    </aside>
  );

  // ── Mobile bottom nav (NO logout button — it's in Header now) ─────────────
  const MobileBottomNav = (
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50
                     ${NAV_BG} border-t ${NAV_BORDER}
                     shadow-[0_-2px_16px_rgba(0,0,0,0.08)]`}>
      <div className="flex items-stretch" style={{ height: 60 }}>
        {bottomNav.map((item) => {
          const active = pathname === item.href;
          const count  = getBadge((item as { badge?: string }).badge);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex flex-1 flex-col items-center justify-center gap-0.5
                transition-colors duration-150 select-none
                ${active ? NAV_ACTIVE : NAV_INACTIVE}
              `}
            >
              {/* Active indicator bar */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2
                                 w-7 h-[3px] rounded-full bg-brand-500" />
              )}

              {/* Icon + unread badge */}
              <span className="relative">
                <item.icon size={18} strokeWidth={active ? 2.5 : 1.75} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5
                                   flex h-[15px] w-[15px] items-center justify-center
                                   rounded-full bg-red-500 text-white
                                   text-[8px] font-bold leading-none">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </span>

              {/* Label */}
              <span className={`text-[9px] leading-none font-semibold ${active ? "font-black" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      {DesktopSidebar}
      {MobileBottomNav}
    </>
  );
}
