"use client";
// src/components/admin/UserManagementTable.tsx
import { useState } from "react";
import toast from "react-hot-toast";
import { FiCheck, FiSlash, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import type { User } from "@/types";

export default function UserManagementTable({ users: initial }: { users: User[] }) {
  const [users, setUsers] = useState(initial);
  const [loading, setLoading] = useState<number | null>(null);

  async function act(userId: number, action: string) {
    setLoading(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`User ${action} successful.`);
        // Optimistic update
        setUsers((prev) => prev.map((u) =>
          u.id === userId ? {
            ...u,
            is_verified:     action === "verify"   ? 1 : u.is_verified,
            account_status:  action === "suspend"  ? "suspended" : action === "activate" ? "active" : u.account_status,
            warning_count:   action === "warn"     ? u.warning_count + 1 : u.warning_count,
          } : u
        ));
      } else {
        toast.error(data.message ?? "Action failed.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div key={user.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Info */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-sm text-gray-900">@{user.username}</p>
              <span className={`badge ${user.is_verified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {user.is_verified ? "Verified" : "Unverified"}
              </span>
              <span className={`badge ${user.account_status === "active" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-600"}`}>
                {user.account_status}
              </span>
              {user.warning_count > 0 && (
                <span className="badge bg-orange-100 text-orange-700">⚠ {user.warning_count} warnings</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{user.email} · {user.first_name} {user.last_name}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {!user.is_verified && (
              <button onClick={() => act(user.id, "verify")} disabled={loading === user.id}
                className="btn-primary text-xs px-2.5 py-1.5">
                <FiCheck size={12} /> Verify
              </button>
            )}
            {user.account_status === "active" ? (
              <button onClick={() => act(user.id, "suspend")} disabled={loading === user.id}
                className="btn-secondary text-xs px-2.5 py-1.5 text-red-600 border-red-100">
                <FiSlash size={12} /> Suspend
              </button>
            ) : (
              <button onClick={() => act(user.id, "activate")} disabled={loading === user.id}
                className="btn-secondary text-xs px-2.5 py-1.5">
                <FiRefreshCw size={12} /> Activate
              </button>
            )}
            <button onClick={() => act(user.id, "warn")} disabled={loading === user.id}
              className="btn-secondary text-xs px-2.5 py-1.5 text-orange-600 border-orange-100">
              <FiAlertTriangle size={12} /> Warn
            </button>
            {user.gov_id_path && (
              <a href={user.gov_id_path} target="_blank" rel="noopener noreferrer"
                className="btn-secondary text-xs px-2.5 py-1.5">View ID</a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
