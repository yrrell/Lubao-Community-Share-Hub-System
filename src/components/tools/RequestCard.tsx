"use client";
// ============================================================
// src/components/tools/RequestCard.tsx
// UPDATED:
//   - Shows approved_at, cancelled_at, returned_at timestamps
//   - "Mark as Active" button for lender (item handed over)
//   - "Confirm Return" button for lender
//   - "File Dispute" button for lender on active/returned
//   - Sign Agreement modal (e-signature + Data Privacy consent)
//   - Profile pictures of both parties for identity verification
// ============================================================
import { useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  FiCheck, FiX, FiDollarSign, FiFileText,
  FiAlertTriangle, FiClock, FiDownload,
} from "react-icons/fi";
import type { Transaction, BorrowAgreement } from "@/types";

interface Props {
  transaction:     Transaction;
  mode:            "lender" | "borrower";
  agreement?:      BorrowAgreement | null;
  onStatusChange?: () => void;
}

// ── Timestamp row helper ───────────────────────────────────────────────────────
function AuditRow({ label, ts }: { label: string; ts: string | null | undefined }) {
  if (!ts) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
      <FiClock size={10} className="shrink-0" />
      <span className="font-medium text-gray-500 dark:text-slate-400">{label}:</span>
      <span>{new Date(ts).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</span>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Transaction["status"] }) {
  const map: Record<string, string> = {
    pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    approved:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    active:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    returned:  "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
    cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    disputed:  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };
  return (
    <span className={`badge shrink-0 capitalize ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default function RequestCard({ transaction: tx, mode, agreement, onStatusChange }: Props) {
  const [loading,       setLoading]      = useState(false);
  const [confirmRef,    setConfirmRef]   = useState("");
  const [showSignModal, setShowSignModal] = useState(false);
  const [consented,     setConsented]    = useState(false);
  const [signing,       setSigning]      = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const isLender   = mode === "lender";
  const isBorrower = mode === "borrower";

  // ── Generic action handler ────────────────────────────────────────────────
  async function doAction(action: string, extra?: Record<string, string>) {
    setLoading(true);
    try {
      const res  = await fetch(`/api/transactions/${tx.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, confirm_ref: confirmRef, ...extra }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`Transaction ${action}d.`);
        onStatusChange?.();
      } else {
        toast.error(data.message ?? "Action failed.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }

  // ── E-Signature canvas helpers ────────────────────────────────────────────
  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    isDrawing.current = true;
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    const rect   = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = "touches" in e ? e.touches[0].clientY - rect.top  : e.nativeEvent.offsetY;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    const rect   = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = "touches" in e ? e.touches[0].clientY - rect.top  : e.nativeEvent.offsetY;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth   = 2;
    ctx.lineCap     = "round";
    ctx.stroke();
  }

  function stopDraw() { isDrawing.current = false; }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ── Submit signature ───────────────────────────────────────────────────────
  async function handleSign() {
    const canvas = canvasRef.current!;
    const sig    = canvas.toDataURL("image/png");

    // Validate non-empty signature
    const blank = document.createElement("canvas");
    blank.width  = canvas.width;
    blank.height = canvas.height;
    if (sig === blank.toDataURL()) {
      toast.error("Please draw your signature.");
      return;
    }

    if (!consented) {
      toast.error("Please accept the Data Privacy consent.");
      return;
    }

    setSigning(true);
    try {
      const res  = await fetch("/api/agreements", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          transaction_id: tx.id,
          signature:      sig,
          consented:      true,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(data.message ?? "Signature submitted!");
        setShowSignModal(false);
        onStatusChange?.();
      } else {
        toast.error(data.message ?? "Signing failed.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setSigning(false);
    }
  }

  const mySignedAt     = isLender   ? agreement?.lender_agreed_at   : agreement?.borrower_agreed_at;
  const otherSignedAt  = isLender   ? agreement?.borrower_agreed_at : agreement?.lender_agreed_at;
  const canSign        = ["approved","active","returned"].includes(tx.status) && !mySignedAt;
  const isFinalized    = Boolean(agreement?.finalized_at);

  return (
    <>
      <div className="card space-y-3">

        {/* ── Header row ────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">

            {/* Borrower profile picture */}
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full
                            border-2 border-gray-100 dark:border-slate-700 bg-gray-100">
              <Image
                src={tx.borrower_pic || "/uploads/defaults/default-user.png"}
                alt={tx.borrower_username ?? "Borrower"}
                fill className="object-cover" sizes="40px"
              />
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                {tx.tool_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {isLender
                  ? <>Requested by <span className="font-medium">@{tx.borrower_username}</span> · {tx.borrower_name}</>
                  : <>Owner: <span className="font-medium">@{tx.lender_username}</span> · {tx.lender_name}</>
                }
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <StatusBadge status={tx.status} />
            <span className={`badge ${
              tx.payment_method === "gcash"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"
            }`}>
              <FiDollarSign size={10} className="mr-1" />
              {tx.payment_method}
            </span>
          </div>
        </div>

        {/* ── Audit trail timestamps ─────────────────────────────────── */}
        <div className="space-y-1 rounded-lg bg-gray-50 dark:bg-slate-800/50 px-3 py-2">
          <AuditRow label="Requested"  ts={tx.created_at} />
          <AuditRow label="Approved"   ts={tx.approved_at} />
          <AuditRow label="Active"     ts={tx.active_at} />
          <AuditRow label="Returned"   ts={tx.returned_at} />
          <AuditRow label="Cancelled"  ts={tx.cancelled_at} />
          <AuditRow label="Disputed"   ts={tx.disputed_at} />
        </div>

        {/* ── GCash anti-scam verification (lender pending) ─────────── */}
        {isLender && tx.status === "pending" && tx.payment_method === "gcash" && (
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200
                          dark:border-yellow-800 p-3 text-xs space-y-1.5">
            <p className="font-semibold text-yellow-800 dark:text-yellow-300">
              🔒 Anti-Scam Verification
            </p>
            <p className="text-yellow-700 dark:text-yellow-400">
              Borrower&apos;s Ref ID: <strong>{tx.payment_ref}</strong>
            </p>
            <input
              className="input text-xs"
              placeholder="Enter matching ref ID to approve"
              value={confirmRef}
              onChange={(e) => setConfirmRef(e.target.value)}
            />
            {tx.payment_screenshot && (
              <a href={tx.payment_screenshot} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 underline text-xs">
                View Payment Screenshot
              </a>
            )}
          </div>
        )}

        {/* ── Agreement / Signature status ──────────────────────────── */}
        {agreement && (
          <div className="rounded-lg border border-brand-100 dark:border-brand-900/40
                          bg-brand-50 dark:bg-brand-900/10 px-3 py-2 text-xs space-y-1">
            <p className="font-semibold text-brand-700 dark:text-brand-300">
              📄 Borrow Agreement
            </p>
            <p className={mySignedAt ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-slate-400"}>
              {mySignedAt ? `✅ You signed at ${new Date(mySignedAt).toLocaleString("en-PH")}` : "⬜ You have not signed yet"}
            </p>
            <p className={otherSignedAt ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-slate-400"}>
              {otherSignedAt
                ? `✅ Other party signed at ${new Date(otherSignedAt).toLocaleString("en-PH")}`
                : "⬜ Waiting for the other party"}
            </p>
            {isFinalized && agreement.pdf_path && (
              <a
                href={agreement.pdf_path}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-1 text-brand-600 dark:text-brand-400 font-semibold underline"
              >
                <FiDownload size={12} /> Download Agreement PDF
              </a>
            )}
          </div>
        )}

        {/* ── Action buttons ─────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">

          {/* LENDER: approve/decline pending */}
          {isLender && tx.status === "pending" && (
            <>
              <button onClick={() => doAction("decline")} disabled={loading}
                className="btn-secondary flex-1 text-red-600 border-red-100 hover:bg-red-50 text-xs py-2">
                <FiX size={13} /> Decline
              </button>
              <button onClick={() => doAction("approve")} disabled={loading}
                className="btn-primary flex-1 text-xs py-2">
                <FiCheck size={13} /> {loading ? "Processing…" : "Approve"}
              </button>
            </>
          )}

          {/* LENDER: mark as active (item handed over) */}
          {isLender && tx.status === "approved" && (
            <button onClick={() => doAction("active")} disabled={loading}
              className="btn-primary flex-1 text-xs py-2">
              <FiCheck size={13} /> {loading ? "…" : "Mark as Handed Over"}
            </button>
          )}

          {/* LENDER: confirm return */}
          {isLender && tx.status === "active" && (
            <button onClick={() => doAction("return")} disabled={loading}
              className="btn-secondary flex-1 text-green-700 border-green-200 hover:bg-green-50 text-xs py-2">
              <FiCheck size={13} /> {loading ? "…" : "Confirm Return"}
            </button>
          )}

          {/* LENDER: dispute on active/returned */}
          {isLender && ["active", "returned"].includes(tx.status) && (
            <button onClick={() => doAction("dispute")} disabled={loading}
              className="btn-secondary flex-none text-orange-600 border-orange-200 hover:bg-orange-50 text-xs px-3 py-2">
              <FiAlertTriangle size={13} /> Dispute
            </button>
          )}

          {/* BORROWER: cancel pending */}
          {isBorrower && tx.status === "pending" && (
            <button onClick={() => doAction("cancel")} disabled={loading}
              className="btn-secondary flex-1 text-red-600 border-red-100 hover:bg-red-50 text-xs py-2">
              <FiX size={13} /> {loading ? "…" : "Cancel Request"}
            </button>
          )}

          {/* Sign agreement button (both parties, when approved/active/returned) */}
          {canSign && (
            <button onClick={() => setShowSignModal(true)}
              className="btn-primary flex-1 text-xs py-2">
              <FiFileText size={13} /> Sign Agreement
            </button>
          )}
        </div>
      </div>

      {/* ── E-Signature Modal ──────────────────────────────────────────────── */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 overflow-y-auto">
          <div className="card w-full max-w-md shadow-2xl space-y-4">

            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Sign Borrow Agreement
            </h2>

            {/* Both parties' profile pictures for identity verification */}
            <div className="flex items-center gap-3">
              {[
                { pic: tx.borrower_pic, name: tx.borrower_name, label: "Borrower" },
                { pic: tx.lender_pic,   name: tx.lender_name,   label: "Lender"   },
              ].map((p) => (
                <div key={p.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full
                                  border-2 border-brand-200 bg-gray-100">
                    <Image
                      src={p.pic || "/uploads/defaults/default-user.png"}
                      alt={p.name ?? p.label} fill className="object-cover" sizes="48px"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">{p.label}</span>
                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate max-w-full px-1">
                    {p.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Data Privacy Act disclaimer */}
            <div className="rounded-lg border border-gray-200 dark:border-slate-700
                            bg-gray-50 dark:bg-slate-800 p-3 text-[11px] leading-relaxed
                            text-gray-600 dark:text-slate-400 max-h-32 overflow-y-auto">
              <strong className="text-gray-800 dark:text-slate-200">Data Privacy Act Consent</strong><br/>
              Under Republic Act No. 10173 (Data Privacy Act of 2012), your personal information
              collected here (name, contact details, government ID on file) is used solely to
              facilitate this community lending transaction. It will not be shared with third parties
              outside this platform without your explicit consent, and will be retained only for the
              period required by applicable regulations.
            </div>

            {/* Consent checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-brand-600"
              />
              <span className="text-xs text-gray-700 dark:text-slate-300">
                I have read and agree to the Data Privacy Act consent above.
                <span className="text-red-500 ml-0.5">*</span>
              </span>
            </label>

            {/* Signature canvas */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">
                Draw your e-signature below <span className="text-red-500">*</span>
              </p>
              <canvas
                ref={canvasRef}
                width={400}
                height={120}
                className="w-full rounded-xl border-2 border-dashed border-gray-300
                           dark:border-slate-600 bg-white dark:bg-slate-900
                           touch-none cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              <button
                onClick={clearCanvas}
                className="mt-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 underline"
              >
                Clear
              </button>
            </div>

            {/* Submit buttons */}
            <div className="flex gap-3">
              <button onClick={() => setShowSignModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleSign}
                disabled={signing || !consented}
                className="btn-primary flex-1"
              >
                {signing ? "Submitting…" : "Submit Signature"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
