"use client";
// src/components/layout/Sidebar.tsx
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  FiSearch, FiMessageSquare, FiBell, FiList,
  FiUser, FiTool, FiLogOut, FiMenu, FiX,
  FiHome, FiUsers, FiFlag, FiShield, FiChevronLeft, FiChevronRight,
} from "react-icons/fi";
import type { SessionUser } from "@/types";
import ThemeToggle from "@/components/ui/ThemeToggle";

interface SidebarProps {
  session: SessionUser;
  unreadNotifs?: number;
  unreadMessages?: number;
  pendingRequests?: number;
}

const userLinks = [
  { href: "/dashboard",     label: "Find Tools",      icon: FiSearch },
  { href: "/chat",          label: "Messages",         icon: FiMessageSquare, badge: "messages" },
  { href: "/notifications", label: "Notifications",   icon: FiBell,          badge: "notifs" },
  { href: "/my-requests",   label: "Lender Tasks",    icon: FiList,          badge: "pending" },
  { href: "/tools",         label: "Post a Tool",     icon: FiTool },
  { href: "/profile",       label: "My Profile",      icon: FiUser },
];

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard",       icon: FiHome },
  { href: "/admin/tools",     label: "Tool Inventory",  icon: FiTool },
  { href: "/admin/users",     label: "User Management", icon: FiUsers },
  { href: "/admin/reports",   label: "Reports & Appeals", icon: FiFlag },
  { href: "/admin/security",  label: "Security Logs",   icon: FiShield },
  { href: "/admin/profile",   label: "My Profile",      icon: FiUser },
];

export default function Sidebar({
  session,
  unreadNotifs = 0,
  unreadMessages = 0,
  pendingRequests = 0,
}: SidebarProps) {
  const pathname      = usePathname();
  const router        = useRouter();
  const [open, setOpen]       = useState(false);
  const [collapsed, setCol]   = useState(false);
  const [loggingOut, setOut]  = useState(false);

  const links = session.role === "admin" ? adminLinks : userLinks;
  const isAdmin = session.role === "admin";

  async function handleLogout() {
    setOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out successfully.");
    router.push("/login");
  }

  function getBadge(badge?: string) {
    if (badge === "messages" && unreadMessages > 0) return unreadMessages;
    if (badge === "notifs"   && unreadNotifs > 0)   return unreadNotifs;
    if (badge === "pending"  && pendingRequests > 0) return pendingRequests;
    return 0;
  }

  const Inner = (
    <div className={`flex h-full flex-col bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 transition-all duration-200 ${collapsed ? "w-16" : "w-64"}`}>

      {/* Brand */}
      <div className={`flex items-center border-b border-gray-100 dark:border-slate-800 p-4 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">
              {isAdmin ? "Community Share Hub" : "Share Hub"}
            </p>
            <h1 className="text-sm font-black text-gray-900 dark:text-white leading-tight">
              {isAdmin ? "Admin Panel" : "Lubao Community"}
            </h1>
          </div>
        )}
        {/* Mobile close */}
        <button onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 md:hidden">
          <FiX size={18} />
        </button>
        {/* Desktop collapse */}
        <button onClick={() => setCol(!collapsed)}
          className="hidden md:flex rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
          {collapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          const count  = getBadge((link as { badge?: string }).badge);
          return (
            <Link key={link.href} href={link.href}
              onClick={() => setOpen(false)}
              title={collapsed ? link.label : undefined}
              className={`sidebar-link ${active ? "active" : ""} flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
              <span className={`flex items-center gap-3 ${collapsed ? "" : ""}`}>
                <link.icon size={16} className="shrink-0" />
                {!collapsed && link.label}
              </span>
              {!collapsed && count > 0 && (
                <span className="badge bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-[10px]">
                  {count}
                </span>
              )}
              {collapsed && count > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: theme + user + logout */}
      <div className="border-t border-gray-100 dark:border-slate-800 p-3 space-y-2">
        {!collapsed && <ThemeToggle className="w-full justify-between" />}

        {!collapsed && (
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-sm font-black">
              {session.username[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-800 dark:text-slate-100">@{session.username}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">{session.role}</p>
            </div>
          </div>
        )}

        <button onClick={handleLogout} disabled={loggingOut}
          title={collapsed ? "Logout" : undefined}
          className={`btn-secondary w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/40 ${collapsed ? "justify-center px-2" : ""}`}>
          <FiLogOut size={15} className="shrink-0" />
          {!collapsed && (loggingOut ? "Logging out…" : "Logout")}
        </button>
      </div>
    </div>
  );

  const sideW = collapsed ? 64 : 256;

  return (
    <>
      {/* Mobile hamburger */}
      <button onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl bg-white dark:bg-slate-900 p-2.5 shadow-md border border-gray-100 dark:border-slate-800 text-gray-600 dark:text-slate-300 md:hidden">
        <FiMenu size={20} />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 z-50 h-full shadow-xl transition-all duration-200
        md:z-30 md:shadow-none md:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}
      `} style={{ width: sideW }}>
        {Inner}
      </aside>

      {/* Spacer for desktop layout — consumed by parent ml-* */}
      <div className="hidden md:block shrink-0 transition-all duration-200" style={{ width: sideW }} />
    </>
  );
}
