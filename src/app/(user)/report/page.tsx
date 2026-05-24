"use client";
// src/app/(user)/report/page.tsx
// NEW: Reports/Appeals submission page for regular users.
// Accessible via Sidebar → "Reports/Appeals" or BottomNav → "Report"
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FiAlertTriangle, FiUpload, FiSend, FiArrowLeft } from "react-icons/fi";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import type { SessionUser } from "@/types";

const ISSUE_TYPES = [
  { value: "item_damage",     label: "Item Damage / Misuse" },
  { value: "non_return",      label: "Item Not Returned" },
  { value: "fraud",           label: "Fraud / Scam" },
  { value: "harassment",      label: "Harassment / Abuse" },
  { value: "account_issue",   label: "Account Issue" },
  { value: "payment_dispute", label: "Payment Dispute" },
  { value: "appeal",          label: "Appeal (Suspension / Ban)" },
  { value: "other",           label: "Other" },
];

interface ReportPageProps {
  session: SessionUser;
}

// Inner form component — session is passed as prop from wrapper
function ReportForm({ session }: ReportPageProps) {
  const router = useRouter();
  const [issueType, setIssueType]   = useState("");
  const [details, setDetails]       = useState("");
  const [evidence, setEvidence]     = useState<File | null>(null);
  const [preview, setPreview]       = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setEvidence(f);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!issueType) { toast.error("Please select an issue type."); return; }
    if (details.trim().length < 20) { toast.error("Please provide more detail (at least 20 characters)."); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("issue_type", issueType);
      fd.set("details", details.trim());
      if (evidence) fd.set("evidence", evidence);

      const res  = await fetch("/api/reports", { method: "POST", body: fd });
      const data = await res.json();

      if (data.status === "success") {
        toast.success("Report submitted. Our team will review it soon.");
        router.push("/dashboard");
      } else {
        toast.error(data.message ?? "Failed to submit report.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />

      <div className="flex flex-col flex-1 min-w-0 md:ml-64">
        <Header />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-5 max-w-2xl mx-auto">

            {/* Page heading */}
            <div className="mb-6">
              <button onClick={() => router.back()}
                className="mb-3 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                <FiArrowLeft size={13} /> Back
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                  <FiAlertTriangle size={18} className="text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reports / Appeals</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Submit a concern or appeal to the admin team</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Issue type */}
              <div className="card">
                <label className="mb-3 block text-sm font-bold text-gray-800 dark:text-slate-100">
                  Issue Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ISSUE_TYPES.map((t) => (
                    <label
                      key={t.value}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-all
                        ${issueType === t.value
                          ? "border-brand-400 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                          : "border-gray-100 dark:border-slate-700 hover:border-brand-300 text-gray-600 dark:text-slate-400"
                        }`}
                    >
                      <input type="radio" name="issue_type" value={t.value}
                        checked={issueType === t.value}
                        onChange={() => setIssueType(t.value)}
                        className="accent-brand-600 h-4 w-4 shrink-0" />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="card">
                <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-slate-100">
                  Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  placeholder="Describe the issue in detail. Include dates, names, and any relevant transaction IDs if applicable. Minimum 20 characters."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="input resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                  required
                />
                <p className="mt-1.5 text-right text-[11px] text-gray-400">
                  {details.length} chars {details.length < 20 && <span className="text-red-400">(min 20)</span>}
                </p>
              </div>

              {/* Evidence upload */}
              <div className="card">
                <label className="mb-2 block text-sm font-bold text-gray-800 dark:text-slate-100">
                  Supporting Evidence <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <p className="mb-3 text-xs text-gray-400 dark:text-slate-500">
                  Upload a screenshot, photo, or document as evidence.
                </p>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-6 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-900/10">
                  {preview ? (
                    <img src={preview} alt="Evidence" className="max-h-36 rounded-lg object-contain" />
                  ) : evidence ? (
                    <div className="text-sm text-gray-600 dark:text-slate-300">
                      📎 {evidence.name}
                    </div>
                  ) : (
                    <>
                      <FiUpload size={22} className="text-gray-300 dark:text-slate-600" />
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        Click to upload image or document
                      </span>
                    </>
                  )}
                  <input type="file" accept="image/*,.pdf,.doc,.docx" className="sr-only" onChange={onFile} />
                </label>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                <FiSend size={15} />
                {loading ? "Submitting…" : "Submit Report / Appeal"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

// Server-side session wrapper
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function ReportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "admin") redirect("/admin/reports");
  return <ReportForm session={session} />;
}
