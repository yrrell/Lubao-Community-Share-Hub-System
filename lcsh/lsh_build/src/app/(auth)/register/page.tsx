"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FiUpload, FiUserPlus, FiArrowLeft } from "react-icons/fi";
import ThemeToggle from "@/components/ui/ThemeToggle";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">{children}</label>;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500" {...props} />;
}
function Section({ title }: { title: string }) {
  return <p className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-3 mt-5 first:mt-0">{title}</p>;
}

interface FormState {
  username: string; email: string; password: string; confirm_password: string;
  first_name: string; middle_name: string; last_name: string; birthday: string;
  phone_number: string; house_street: string; barangay: string; city_province: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [govIdPreview, setGovIdPreview] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [form, setForm] = useState<FormState>({
    username: "", email: "", password: "", confirm_password: "",
    first_name: "", middle_name: "", last_name: "", birthday: "",
    phone_number: "", house_street: "", barangay: "", city_province: "",
  });

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  function onFile(e: React.ChangeEvent<HTMLInputElement>, type: "gov" | "profile") {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    if (type === "gov") { setGovIdFile(f); setGovIdPreview(url); }
    else { setProfileFile(f); setProfilePreview(url); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm_password) { toast.error("Passwords do not match."); return; }
    if (!govIdFile) { toast.error("Government ID is required."); return; }
    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (k !== "confirm_password") fd.set(k, v); });
    fd.set("gov_id", govIdFile);
    if (profileFile) fd.set("profile_pic", profileFile);
    try {
      const res  = await fetch("/api/auth/register", { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Registered! Wait for admin verification.");
        router.push("/login");
      } else { toast.error(data.message ?? "Registration failed."); }
    } catch { toast.error("Network error."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 px-4 py-10">
      <div className="fixed top-4 right-4 z-10"><ThemeToggle compact /></div>
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white font-display">Create Account</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Lubao Community Share Hub</p>
        </div>
        <form onSubmit={handleSubmit} className="card shadow-md space-y-3">
          <Section title="Account" />
          <div><Label>Username *</Label><Input value={form.username} onChange={set("username")} placeholder="your_username" required autoCapitalize="none" /></div>
          <div><Label>Email *</Label><Input value={form.email} onChange={set("email")} type="email" placeholder="you@email.com" required /></div>
          <div><Label>Password *</Label><Input value={form.password} onChange={set("password")} type="password" placeholder="••••••••" required /></div>
          <div><Label>Confirm Password *</Label><Input value={form.confirm_password} onChange={set("confirm_password")} type="password" placeholder="••••••••" required /></div>
          <Section title="Personal Info" />
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First Name *</Label><Input value={form.first_name} onChange={set("first_name")} placeholder="Juan" required /></div>
            <div><Label>Last Name *</Label><Input value={form.last_name} onChange={set("last_name")} placeholder="Dela Cruz" required /></div>
          </div>
          <div><Label>Middle Name</Label><Input value={form.middle_name} onChange={set("middle_name")} placeholder="Optional" /></div>
          <div><Label>Birthday *</Label><Input value={form.birthday} onChange={set("birthday")} type="date" required /></div>
          <div><Label>Phone Number</Label><Input value={form.phone_number} onChange={set("phone_number")} type="tel" placeholder="09xxxxxxxxx" /></div>
          <Section title="Address" />
          <div><Label>House / Street</Label><Input value={form.house_street} onChange={set("house_street")} placeholder="123 Mabini St." /></div>
          <div><Label>Barangay</Label><Input value={form.barangay} onChange={set("barangay")} placeholder="Barangay San Nicolas" /></div>
          <div><Label>City / Province</Label><Input value={form.city_province} onChange={set("city_province")} placeholder="Lubao, Pampanga" /></div>
          <Section title="Identity Verification" />
          <div>
            <Label>Government ID * (required for verification)</Label>
            <label className="block cursor-pointer">
              <input type="file" accept="image/*" onChange={(e) => onFile(e, "gov")} className="hidden" />
              <div className={`flex h-32 items-center justify-center rounded-xl border-2 border-dashed transition-colors ${govIdPreview ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20" : "border-gray-200 dark:border-slate-700 hover:border-brand-300"}`}>
                {govIdPreview
                  ? <img src={govIdPreview} alt="ID preview" className="h-full w-full rounded-xl object-cover" />
                  : <div className="flex flex-col items-center gap-1 text-gray-400"><FiUpload size={20} /><span className="text-xs">Upload Gov ID</span></div>}
              </div>
            </label>
          </div>
          <div>
            <Label>Profile Photo (optional)</Label>
            <label className="block cursor-pointer">
              <input type="file" accept="image/*" onChange={(e) => onFile(e, "profile")} className="hidden" />
              <div className={`flex h-24 items-center justify-center rounded-xl border-2 border-dashed transition-colors ${profilePreview ? "border-brand-400" : "border-gray-200 dark:border-slate-700 hover:border-brand-300"}`}>
                {profilePreview
                  ? <img src={profilePreview} alt="profile" className="h-full w-full rounded-xl object-cover" />
                  : <div className="flex flex-col items-center gap-1 text-gray-400"><FiUpload size={18} /><span className="text-xs">Profile Photo</span></div>}
              </div>
            </label>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            <FiUserPlus size={16} />
            {loading ? "Registering…" : "Create Account"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-gray-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1">
            <FiArrowLeft size={12} /> Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
