// src/app/(admin)/admin/dashboard/page.tsx
// FIXED: uses `items` and `borrows` tables. Added Header. Serialised DB rows.
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FiCheckCircle, FiExternalLink, FiRefreshCw } from "react-icons/fi";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import type { SessionUser } from "@/types";

interface UserRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  gov_id_path: string | null;
}

interface DashboardCounts {
  totalItems:      number;
  unverifiedUsers: number;
  pendingBorrows:  number;
  openReports:     number;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`card border-l-4 ${color}`}>
      <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session,   setSession]   = useState<SessionUser | null>(null);
  const [counts,    setCounts]    = useState<DashboardCounts | null>(null);
  const [unverified, setUnverified] = useState<UserRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [verifying, setVerifying] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessRes, dashRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/admin/dashboard"),
      ]);
      if (!sessRes.ok) { router.replace("/login"); return; }
      const sessData = await sessRes.json();
      if (sessData.role !== "admin") { router.replace("/login"); return; }
      setSession(sessData);
      if (dashRes.ok) {
        const dash = await dashRes.json();
        setCounts(dash.counts);
        setUnverified(dash.unverified);
      }
    } catch {
      toast.error("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleVerify(userId: number, name: string) {
    setVerifying(userId);
    try {
      const res  = await fetch(`/api/users/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "verify" }),
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(`${name} verified! Approval email sent.`);
        setUnverified(prev => prev.filter(u => u.id !== userId));
        setCounts(prev => prev ? { ...prev, unverifiedUsers: prev.unverifiedUsers - 1 } : prev);
      } else {
        toast.error(json.message ?? "Verification failed.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setVerifying(null);
    }
  }

  if (loading || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />

      <div className="flex flex-col flex-1 min-w-0 md:ml-64">
        <Header />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Overview of pending items</p>
              </div>
              <button onClick={load} className="btn-secondary gap-1.5 text-xs">
                <FiRefreshCw size={13} /> Refresh
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Total Items"      value={counts?.totalItems      ?? 0} color="border-brand-400"  />
              <StatCard label="Unverified Users" value={counts?.unverifiedUsers ?? 0} color="border-blue-400"   />
              <StatCard label="Pending Borrows"  value={counts?.pendingBorrows  ?? 0} color="border-yellow-400" />
              <StatCard label="Open Reports"     value={counts?.openReports     ?? 0} color="border-red-400"    />
            </div>

            {/* Pending Verifications */}
            <div className="card">
              <h3 className="mb-4 font-bold text-gray-900 dark:text-white">Pending Identity Verifications</h3>
              {unverified.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500">No users pending verification. ✅</p>
              ) : (
                <div className="space-y-3">
                  {unverified.map((user) => (
                    <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-slate-800 p-3">
                      <div>
                        <p className="font-medium text-sm text-gray-800 dark:text-slate-200">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{user.email}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {user.gov_id_path && (
                          <a href={user.gov_id_path} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs px-2 py-1 gap-1">
                            <FiExternalLink size={11} /> View ID
                          </a>
                        )}
                        <button
                          onClick={() => handleVerify(user.id, `${user.first_name} ${user.last_name}`)}
                          disabled={verifying === user.id}
                          className="btn-primary text-xs px-3 py-1 gap-1"
                        >
                          <FiCheckCircle size={13} />
                          {verifying === user.id ? "Verifying…" : "Verify"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
