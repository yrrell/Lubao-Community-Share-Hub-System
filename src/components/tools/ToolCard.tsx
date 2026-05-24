"use client";
// ============================================================
// src/components/tools/ToolCard.tsx
// UPDATED:
//   - Shows owner profile picture for identity verification
//   - Cancellation button when borrower has a pending request
//   - Full borrow modal with GCash + note fields
// ============================================================
import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import { FiUser, FiSend, FiTag, FiX } from "react-icons/fi";
import type { Tool, Transaction } from "@/types";

interface ToolCardProps {
  tool:            Tool;
  currentUserId?:  number;
  // Pass an active pending transaction for this tool if one exists
  pendingRequest?: Transaction | null;
  onRequestChange?: () => void;   // callback to refresh parent after action
}

export default function ToolCard({
  tool,
  currentUserId,
  pendingRequest,
  onRequestChange,
}: ToolCardProps) {
  const [loading,     setLoading]     = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [payMethod,   setPayMethod]   = useState<"free" | "gcash">("free");
  const [gcashRef,    setGcashRef]    = useState("");
  const [screenshot,  setScreenshot]  = useState<File | null>(null);
  const [borrowerNote, setBorrowerNote] = useState("");
  const [cancelling,  setCancelling]  = useState(false);

  const isOwner = currentUserId === tool.owner_id;

  // ── Send borrow request ────────────────────────────────────────────────────
  async function handleBorrowSubmit() {
    setLoading(true);
    const fd = new FormData();
    fd.set("tool_id",        String(tool.id));
    fd.set("payment_method", payMethod);
    if (borrowerNote) fd.set("borrower_note", borrowerNote);
    if (payMethod === "gcash") {
      fd.set("payment_ref", gcashRef);
      if (screenshot) fd.set("payment_screenshot", screenshot);
    }

    try {
      const res  = await fetch("/api/transactions", { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Borrow request sent!");
        setShowModal(false);
        onRequestChange?.();
      } else {
        toast.error(data.message ?? "Request failed.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }

  // ── Cancel a pending request ───────────────────────────────────────────────
  async function handleCancel() {
    if (!pendingRequest) return;
    setCancelling(true);
    try {
      const res  = await fetch(`/api/transactions/${pendingRequest.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Request cancelled.");
        onRequestChange?.();
      } else {
        toast.error(data.message ?? "Could not cancel.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setCancelling(false);
    }
  }

  const hasPending = Boolean(pendingRequest && pendingRequest.status === "pending");

  return (
    <>
      <div className="card flex flex-col gap-3 hover:-translate-y-1 hover:shadow-md transition-all duration-200">

        {/* Tool image */}
        <div className="relative h-44 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800">
          <Image
            src={tool.image_url || "/uploads/defaults/default-tool.png"}
            alt={tool.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 300px"
          />
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white leading-tight truncate">
            {tool.name}
          </h3>
          {tool.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 line-clamp-2">
              {tool.description}
            </p>
          )}

          {/* Owner identity row — profile picture for verification */}
          <div className="mt-2 flex items-center gap-2">
            <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
              <Image
                src={tool.owner_pic || "/uploads/defaults/default-user.png"}
                alt={tool.owner_username ?? "Owner"}
                fill
                className="object-cover"
                sizes="24px"
              />
            </div>
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
              <FiUser size={10} />
              @{tool.owner_username}
            </span>
          </div>
        </div>

        {/* Status + Actions */}
        <div className="flex items-center justify-between gap-2">
          <span className={`badge ${
            tool.status === "available"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}>
            <FiTag size={10} className="mr-1" />
            {tool.status}
          </span>

          {/* Owner label */}
          {isOwner && (
            <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">
              Your item
            </span>
          )}

          {/* Pending: cancel button for borrower */}
          {!isOwner && hasPending && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200
                         dark:border-red-800 bg-red-50 dark:bg-red-900/20
                         px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400
                         hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
            >
              <FiX size={11} />
              {cancelling ? "Cancelling…" : "Cancel Request"}
            </button>
          )}

          {/* Not owner, no pending, tool available: show borrow button */}
          {!isOwner && !hasPending && tool.status === "available" && (
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary text-xs px-3 py-1.5"
            >
              <FiSend size={12} /> Borrow
            </button>
          )}
        </div>

        {/* Pending request indicator */}
        {hasPending && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200
                          dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
            ⏳ Your request is pending — submitted{" "}
            {new Date(pendingRequest!.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
          </div>
        )}
      </div>

      {/* ── Borrow Modal ────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="card w-full max-w-md shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              {/* Owner profile pic for identity check */}
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full
                              border-2 border-brand-200 bg-gray-100">
                <Image
                  src={tool.owner_pic || "/uploads/defaults/default-user.png"}
                  alt={tool.owner_username ?? ""}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                  Borrow Request
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {tool.name} · by @{tool.owner_username}
                </p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">
                Payment Method
              </p>
              <div className="flex gap-4">
                {(["free", "gcash"] as const).map((m) => (
                  <label key={m} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio" name="pay" value={m}
                      checked={payMethod === m}
                      onChange={() => setPayMethod(m)}
                      className="accent-brand-600"
                    />
                    {m === "free" ? "Free / Deposit" : "GCash"}
                  </label>
                ))}
              </div>
            </div>

            {payMethod === "gcash" && (
              <>
                <div className="mb-3">
                  <p className="mb-1 text-xs font-semibold text-gray-700 dark:text-slate-300">
                    GCash Reference ID <span className="text-red-500">*</span>
                  </p>
                  <input
                    className="input"
                    placeholder="e.g. 1234567890"
                    value={gcashRef}
                    onChange={(e) => setGcashRef(e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <p className="mb-1 text-xs font-semibold text-gray-700 dark:text-slate-300">
                    Payment Screenshot
                  </p>
                  <input
                    type="file" accept="image/*"
                    className="input py-2 text-xs"
                    onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                  />
                </div>
              </>
            )}

            {/* Borrower note */}
            <div className="mb-5">
              <p className="mb-1 text-xs font-semibold text-gray-700 dark:text-slate-300">
                Note to Lender (optional)
              </p>
              <textarea
                className="input min-h-[60px] resize-none text-sm"
                placeholder="When will you pick it up? Any questions?"
                value={borrowerNote}
                onChange={(e) => setBorrowerNote(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleBorrowSubmit}
                disabled={loading || (payMethod === "gcash" && !gcashRef)}
                className="btn-primary flex-1"
              >
                {loading ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
