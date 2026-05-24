"use client";
// src/components/report/ReportForm.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FiUpload } from "react-icons/fi";

const ISSUE_TYPES = [
  "Broken Tool / Damage",
  "Non-Return",
  "Scam / Fraud",
  "Harassment",
  "Appeal - Account Suspension",
  "Request - Information Update",
  "Other",
];

export default function ReportForm() {
  const router = useRouter();
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [details, setDetails]     = useState("");
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!details.trim()) { toast.error("Please provide details."); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("issue_type", issueType);
      fd.set("details", details);
      if (file) fd.set("evidence", file);

      const res  = await fetch("/api/reports", { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Report submitted successfully! Admin will review it.");
        router.push("/dashboard");
      } else {
        toast.error(data.message ?? "Failed to submit report.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Issue Type */}
      <div>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 block mb-1.5">
          Issue Type
        </label>
        <select
          value={issueType}
          onChange={(e) => setIssueType(e.target.value)}
          className="input"
        >
          {ISSUE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Evidence Photo */}
      <div>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 block mb-1.5">
          Evidence Photo
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 hover:border-brand-300 transition-colors">
          <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {file ? file.name : "Choose File"}
          </span>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {file ? "" : "No file chosen"}
          </span>
          {preview && (
            <img src={preview} alt="preview" className="ml-auto h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-slate-700" />
          )}
        </label>
      </div>

      {/* Details */}
      <div>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 block mb-1.5">
          Details
        </label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe the incident clearly. Include dates, usernames, and any other relevant information…"
          className="input min-h-[120px] resize-none"
          required
        />
      </div>

      {issueType === "Appeal - Account Suspension" && (
        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 p-3 text-xs text-blue-700 dark:text-blue-300">
          ℹ️ For account appeals, explain why your suspension should be lifted. An admin will review and respond within 48 hours.
        </div>
      )}

      {issueType === "Request - Information Update" && (
        <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/40 p-3 text-xs text-yellow-800 dark:text-yellow-300">
          ℹ️ For information updates (name, birthday, address), please provide proof such as a government ID or marriage certificate.
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 text-sm transition-all active:scale-95 disabled:opacity-50">
        {loading ? "Submitting…" : "Submit Report"}
      </button>
    </form>
  );
}
