"use client";
// src/app/(admin)/admin/dashboard/page.tsx
// UPDATED: Uses `useSession("admin")` hook instead of inline session fetch.
//          This eliminates the duplicate-load race condition that caused the
//          login loop. The hook uses window.location.href for redirects,
//          guaranteeing cookies are committed before the next request.
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { FiCheckCircle, FiExternalLink, FiRefreshCw } from "react-icons/fi";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useSession } from "@/hooks/useSession";

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
  // useSession handles all redirect logic cleanly
  const { session, loading: sessionLoading } = useSession("admin");

  const [counts,     setCounts]     = useState<DashboardCounts | null>(null);
  const [unverified, setUnverified] = useState<UserRow[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [verifying, setVerifying]   = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const dash = await res.json();
        setCounts(dash.counts);
        setUnverified(dash.unverified);
      }
    } catch {
      toast.error("Failed to load dashboard data.");
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Only load data once session is confirmed
  useEffect(() => {
    if (session) loadData();
  }, [session, loadData]);

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

  if (sessionLoading || !session) {
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
              <button onClick={loadData} disabled={dataLoading} className="btn-secondary gap-1.5 text-xs">
                <FiRefreshCw size={13} className={dataLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {/* Notification Banner */}
            {counts && counts.unverifiedUsers > 0 && (
              <div className="rounded-xl border border-yellow-200 dark:border-yellow-800/50 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 flex items-center gap-3">
                <span className="text-yellow-500 text-lg">⚠️</span>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>{counts.unverifiedUsers}</strong> user{counts.unverifiedUsers !== 1 ? "s" : ""} awaiting identity verification.
                </p>
              </div>
            )}

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
              {dataLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-4 border-brand-500 border-t-transparent rounded-full" />
                </div>
              ) : unverified.length === 0 ? (
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
                          <a href={user.gov_id_path} target="_blank" rel="noopener noreferrer"
                            className="btn-secondary text-xs px-2 py-1 gap-1">
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
