"use client";
// src/components/tools/ToolCard.tsx
import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import { FiUser, FiSend, FiTag } from "react-icons/fi";
import type { Tool } from "@/types";

interface ToolCardProps {
  tool: Tool;
  currentUserId?: number;
}

export default function ToolCard({ tool, currentUserId }: ToolCardProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"free" | "gcash">("free");
  const [gcashRef, setGcashRef] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const isOwner = currentUserId === tool.owner_id;

  async function handleBorrowSubmit() {
    setLoading(true);
    const fd = new FormData();
    fd.set("tool_id", String(tool.id));
    fd.set("payment_method", payMethod);
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
      } else {
        toast.error(data.message ?? "Request failed.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="card flex flex-col gap-3 hover:-translate-y-1 hover:shadow-md transition-all duration-200">
        {/* Image */}
        <div className="relative h-44 w-full overflow-hidden rounded-xl bg-gray-100">
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
          <h3 className="font-semibold text-gray-900 leading-tight truncate">{tool.name}</h3>
          {tool.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{tool.description}</p>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
            <FiUser size={12} />
            @{tool.owner_username}
          </p>
        </div>

        {/* Status badge */}
        <div className="flex items-center justify-between">
          <span className={`badge ${tool.status === "available" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
            <FiTag size={10} className="mr-1" />
            {tool.status}
          </span>

          {!isOwner && tool.status === "available" && (
            <button onClick={() => setShowModal(true)} className="btn-primary text-xs px-3 py-1.5">
              <FiSend size={12} /> Borrow
            </button>
          )}
          {isOwner && (
            <span className="text-xs text-brand-600 font-medium">Your tool</span>
          )}
        </div>
      </div>

      {/* Borrow Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="card w-full max-w-md shadow-2xl">
            <h2 className="mb-1 text-base font-bold text-gray-900">Borrow Request</h2>
            <p className="mb-4 text-sm text-gray-500">{tool.name}</p>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">Payment Method</label>
              <div className="flex gap-3">
                {["free", "gcash"].map((m) => (
                  <label key={m} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="radio" name="pay" value={m} checked={payMethod === m}
                      onChange={() => setPayMethod(m as "free" | "gcash")}
                      className="accent-brand-600" />
                    {m === "free" ? "Free / Deposit" : "GCash"}
                  </label>
                ))}
              </div>
            </div>

            {payMethod === "gcash" && (
              <>
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">GCash Reference ID</label>
                  <input className="input" placeholder="e.g. 1234567890" value={gcashRef} onChange={(e) => setGcashRef(e.target.value)} />
                </div>
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Payment Screenshot</label>
                  <input type="file" accept="image/*" className="input py-2 text-xs"
                    onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)} />
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleBorrowSubmit} disabled={loading} className="btn-primary flex-1">
                {loading ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
