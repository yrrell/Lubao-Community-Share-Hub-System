"use client";
// src/app/(user)/tools/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FiUpload, FiTool } from "react-icons/fi";

export default function PostToolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ tool_name: "", description: "" });
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Please upload a photo of the tool."); return; }

    setLoading(true);
    const fd = new FormData();
    fd.set("tool_name", form.tool_name);
    fd.set("description", form.description);
    fd.set("tool_photo", file);

    try {
      const res  = await fetch("/api/tools", { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Tool submitted! Awaiting admin approval.");
        router.push("/dashboard");
      } else {
        toast.error(data.message ?? "Submission failed.");
      }
    } catch {
      toast.error("Network error.");
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

  return (
    <div className="flex min-h-screen bg-gray-50 items-start justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Post a Tool</h2>
          <p className="text-sm text-gray-500">Share a tool with your community</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 shadow-md">
          {/* Photo upload */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Tool Photo *</label>
            <label className="block cursor-pointer">
              <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
              <div className={`flex h-40 items-center justify-center rounded-xl border-2 border-dashed
                ${preview ? "border-brand-400" : "border-gray-200 hover:border-brand-300"} bg-gray-50 transition-colors`}>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="preview" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-400">
                    <FiUpload size={24} />
                    <span className="text-xs">Click to upload</span>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Tool Name *</label>
            <input className="input" placeholder="e.g. Electric Drill" required
              value={form.tool_name} onChange={(e) => setForm({ ...form, tool_name: e.target.value })} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Description</label>
            <textarea className="input min-h-24 resize-none" placeholder="Condition, usage notes, etc."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            <FiTool size={16} />
            {loading ? "Submitting…" : "Submit for Approval"}
          </button>
        </form>
      </div>
    </div>
  );
}
