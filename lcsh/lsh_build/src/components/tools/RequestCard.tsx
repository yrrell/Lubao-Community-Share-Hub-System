"use client";
// src/components/tools/RequestCard.tsx
import { useState } from "react";
import toast from "react-hot-toast";
import { FiCheck, FiX, FiDollarSign } from "react-icons/fi";
import type { Transaction } from "@/types";

interface Props {
  transaction: Transaction;
  mode: "lender" | "borrower";
}

export default function RequestCard({ transaction: tx }: Props) {
  const [loading, setLoading] = useState(false);
  const [confirmRef, setConfirmRef] = useState("");
  const [done, setDone] = useState(false);

  async function handleAction(action: "approve" | "declined") {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, confirm_ref: confirmRef }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(action === "approve" ? "Request approved!" : "Request declined.");
        setDone(true);
      } else {
        toast.error(data.message ?? "Action failed.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="card border-brand-200 bg-brand-50 text-center py-4 text-sm text-brand-700 font-medium">
        ✅ Request handled
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-sm text-gray-900">{tx.tool_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Requested by <span className="font-medium">@{tx.borrower_username}</span> · {tx.borrower_name}
          </p>
          <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString("en-PH")}</p>
        </div>
        <span className={`badge shrink-0 ${tx.payment_method === "gcash" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
          <FiDollarSign size={10} className="mr-1" />
          {tx.payment_method}
        </span>
      </div>

      {tx.payment_method === "gcash" && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs space-y-1.5">
          <p className="font-semibold text-yellow-800">🔒 Anti-Scam Verification</p>
          <p className="text-yellow-700">Borrower&apos;s Ref ID: <strong>{tx.payment_ref}</strong></p>
          <input
            className="input text-xs"
            placeholder="Enter matching ref ID to approve"
            value={confirmRef}
            onChange={(e) => setConfirmRef(e.target.value)}
          />
          {tx.payment_screenshot && (
            <a href={tx.payment_screenshot} target="_blank" rel="noopener noreferrer"
              className="text-blue-600 underline">View Payment Screenshot</a>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => handleAction("declined")}
          disabled={loading}
          className="btn-secondary flex-1 text-red-600 border-red-100 hover:bg-red-50 text-xs py-2">
          <FiX size={13} /> Decline
        </button>
        <button
          onClick={() => handleAction("approve")}
          disabled={loading}
          className="btn-primary flex-1 text-xs py-2">
          <FiCheck size={13} /> {loading ? "Processing…" : "Approve"}
        </button>
      </div>
    </div>
  );
}
