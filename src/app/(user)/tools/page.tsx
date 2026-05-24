"use client";
// src/app/(user)/tools/page.tsx
// ENHANCED:
//  - Displays lender info (name + barangay) for proximity awareness
//  - Borrow type selector: Free / GCash / Physical Cash / Donation
//  - Condition selector, max borrow days, location field
//  - Fee field only shown when borrow_type = fee_based
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FiUpload, FiTool, FiInfo, FiMapPin, FiDollarSign } from "react-icons/fi";

interface LenderInfo {
  first_name: string;
  last_name: string;
  username: string;
  full_address: string | null;
}

type BorrowType = "free" | "fee_based" | "donation";
type Condition  = "new" | "like_new" | "good" | "fair" | "poor";

const BORROW_TYPE_OPTIONS: { value: BorrowType; label: string; icon: string; desc: string }[] = [
  { value: "free",      label: "Free",           icon: "🎁", desc: "No payment required" },
  { value: "fee_based", label: "Fee-Based",       icon: "💳", desc: "GCash or Physical Cash" },
  { value: "donation",  label: "Donation",        icon: "🤝", desc: "Pay what you can" },
];

const CONDITION_OPTIONS: { value: Condition; label: string; color: string }[] = [
  { value: "new",       label: "New",       color: "text-emerald-600" },
  { value: "like_new",  label: "Like New",  color: "text-green-600"   },
  { value: "good",      label: "Good",      color: "text-blue-600"    },
  { value: "fair",      label: "Fair",      color: "text-amber-600"   },
  { value: "poor",      label: "Poor",      color: "text-red-500"     },
];

export default function PostToolPage() {
  const router  = useRouter();
  const [loading,   setLoading]   = useState(false);
  const [preview,   setPreview]   = useState<string | null>(null);
  const [file,      setFile]      = useState<File | null>(null);
  const [lender,    setLender]    = useState<LenderInfo | null>(null);

  const [form, setForm] = useState({
    tool_name:       "",
    description:     "",
    borrow_type:     "free" as BorrowType,
    condition:       "good" as Condition,
    fee_per_day:     "",
    max_borrow_days: "7",
    location:        "",
  });

  // Load lender info from session
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) setLender(data.user as LenderInfo);
      })
      .catch(() => {});
  }, []);

  // Extract barangay from full_address for display
  const lenderBarangay = lender?.full_address
    ? lender.full_address.split(",")[1]?.trim() ?? lender.full_address
    : "—";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Please upload a photo of the tool."); return; }

    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    fd.set("tool_photo", file);

    try {
      const res  = await fetch("/api/tools", { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Tool posted! Awaiting admin review.");
        router.push("/dashboard");
      } else {
        toast.error(data.message ?? "Submission failed.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950 items-start justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-xl font-black text-gray-900 dark:text-white font-display">Post a Tool</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Share a tool with your community</p>
        </div>

        {/* Lender Info Card */}
        {lender && (
          <div className="mb-4 rounded-xl border border-brand-200 dark:border-brand-900/50
                          bg-brand-50 dark:bg-brand-900/20 px-4 py-3 flex items-start gap-3">
            <FiInfo size={16} className="text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
            <div className="text-xs text-brand-800 dark:text-brand-300">
              <p className="font-bold">
                Posting as: {lender.first_name} {lender.last_name}{" "}
                <span className="font-normal text-brand-600">@{lender.username}</span>
              </p>
              <p className="flex items-center gap-1 mt-0.5 text-brand-600 dark:text-brand-400">
                <FiMapPin size={11} /> {lenderBarangay}, Lubao, Pampanga
              </p>
            </div>
          </div>
        )}

        <div className="card space-y-5 shadow-md dark:bg-slate-900">

          {/* Photo Upload */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">
              Tool Photo *
            </label>
            <label className="block cursor-pointer">
              <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
              <div className={`flex h-44 items-center justify-center rounded-xl border-2 border-dashed
                transition-colors overflow-hidden
                ${preview
                  ? "border-brand-400"
                  : "border-gray-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 bg-gray-50 dark:bg-slate-800"}`}>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-slate-500">
                    <FiUpload size={26} />
                    <span className="text-xs font-medium">Click to upload</span>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Tool Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">
              Tool Name *
            </label>
            <input
              className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="e.g. Electric Drill, Hacksaw"
              required
              value={form.tool_name}
              onChange={set("tool_name")}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              className="input min-h-20 resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              placeholder="Condition notes, usage instructions, accessories included…"
              value={form.description}
              onChange={set("description")}
            />
          </div>

          {/* Condition */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-slate-300">
              Condition
            </label>
            <div className="flex gap-2 flex-wrap">
              {CONDITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, condition: opt.value }))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all
                    ${form.condition === opt.value
                      ? `border-brand-400 bg-brand-50 dark:bg-brand-900/30 ${opt.color} ring-1 ring-brand-300`
                      : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-300"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Borrow Type */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-slate-300">
              Borrowing Terms
            </label>
            <div className="space-y-2">
              {BORROW_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all
                    ${form.borrow_type === opt.value
                      ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20 ring-1 ring-brand-300"
                      : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"}`}
                >
                  <input
                    type="radio"
                    name="borrow_type"
                    value={opt.value}
                    checked={form.borrow_type === opt.value}
                    onChange={set("borrow_type")}
                    className="accent-brand-600"
                  />
                  <span className="text-lg">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{opt.label}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Fee — only shown for fee_based */}
          {form.borrow_type === "fee_based" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">
                Fee per Day (₱)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  <FiDollarSign size={14} />
                </span>
                <input
                  className="input pl-8 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.fee_per_day}
                  onChange={set("fee_per_day")}
                />
              </div>
              <p className="mt-1 text-[10px] text-gray-400">
                Accepted: GCash or Physical Cash. Provide payment instructions in the description.
              </p>
            </div>
          )}

          {/* Max Borrow Days & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">
                Max Borrow Days
              </label>
              <input
                className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                type="number"
                min="1"
                max="30"
                value={form.max_borrow_days}
                onChange={set("max_borrow_days")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">
                Pickup Location
              </label>
              <input
                className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                placeholder="e.g. Brgy. San Pablo"
                value={form.location}
                onChange={set("location")}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            className="btn-primary w-full"
          >
            <FiTool size={16} />
            {loading ? "Submitting…" : "Submit for Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}
