"use client";
// src/components/tools/BorrowRequestForm.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FiUpload } from "react-icons/fi";

interface Props {
  toolId: number;
  toolName: string;
  paymentMethod: string;
  fee: number;
}

export default function BorrowRequestForm({ toolId, toolName, paymentMethod, fee }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [payRef, setPayRef]         = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview]       = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setScreenshot(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((paymentMethod === "gcash" || paymentMethod === "cash") && !payRef.trim()) {
      toast.error("Please enter a payment reference number.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("tool_id", String(toolId));
      fd.set("payment_method", paymentMethod);
      if (payRef) fd.set("payment_ref", payRef);
      if (screenshot) fd.set("payment_screenshot", screenshot);

      const res  = await fetch("/api/transactions", { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Borrow request sent! Waiting for owner approval.");
        router.push("/my-requests");
      } else {
        toast.error(data.message ?? "Failed to submit request.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-bold text-gray-900 dark:text-white">Request to Borrow</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400">
        You are requesting: <strong className="text-gray-800 dark:text-slate-200">{toolName}</strong>
      </p>

      <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-slate-400">Payment Type</span>
          <span className={`font-bold ${
            paymentMethod === "free" ? "text-green-600" :
            paymentMethod === "gcash" ? "text-blue-600" : "text-yellow-600"
          }`}>
            {paymentMethod === "free" ? "🎁 Free" : paymentMethod === "gcash" ? "📱 GCash" : "💵 Cash"}
          </span>
        </div>
        {fee > 0 && (
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600 dark:text-slate-400">Fee</span>
            <span className="font-bold text-gray-800 dark:text-slate-200">₱{fee.toFixed(2)}/day</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {(paymentMethod === "gcash" || paymentMethod === "cash") && (
          <>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                {paymentMethod === "gcash" ? "GCash Reference No." : "Payment Reference / Note"} *
              </label>
              <input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder={paymentMethod === "gcash" ? "e.g. 1234567890123" : "Agreed payment details"}
                className="input mt-1 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                Payment Screenshot (optional but recommended)
              </label>
              <label className="mt-1 flex h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-brand-300 transition-colors">
                <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                {preview
                  ? <img src={preview} alt="screenshot" className="h-full w-full rounded-xl object-cover" />
                  : <div className="flex flex-col items-center gap-1 text-gray-400 text-xs">
                      <FiUpload size={18} /><span>Upload screenshot</span>
                    </div>
                }
              </label>
            </div>
          </>
        )}

        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 p-3 text-xs text-blue-700 dark:text-blue-300">
          ℹ️ Your request will be reviewed by the tool owner. You&apos;ll receive a notification once approved.
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Sending Request…" : "📤 Send Borrow Request"}
        </button>
      </form>
    </div>
  );
}
