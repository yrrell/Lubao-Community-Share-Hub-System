"use client";
// src/app/(auth)/register/page.tsx
// UPDATED:
//  - Municipality locked to "Lubao, Pampanga"
//  - Barangay is now a scrollable radio-button grid (all 44 barangays)
//  - Improved form sections with visual dividers
//  - Password strength indicator
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FiUpload, FiUserPlus, FiArrowLeft, FiLock, FiMapPin } from "react-icons/fi";
import ThemeToggle from "@/components/ui/ThemeToggle";

// ─── All 44 Barangays of Lubao, Pampanga ────────────────────────────────────
const LUBAO_BARANGAYS = [
  "Balantacan",
  "Bancal Pugad",
  "Bancal Sinubli",
  "Baruya (San Rafael)",
  "Calangain",
  "Concepcion",
  "Dela Paz",
  "Del Carmen",
  "Don Ignacio Dimson",
  "Lourdes (Lauc Pao)",
  "Prado Siongco",
  "Remedios",
  "San Agustin",
  "San Antonio",
  "San Francisco",
  "San Isidro",
  "San Jose Apunan",
  "San Jose Gumi",
  "San Juan (Poblacion)",
  "San Matias",
  "San Miguel",
  "San Nicolas 1st (Poblacion)",
  "San Nicolas 2nd",
  "San Pablo 1st",
  "San Pablo 2nd",
  "San Pedro Palcarangan",
  "San Pedro Saug",
  "San Roque Arbol",
  "San Roque Dau",
  "San Vicente",
  "Santa Barbara",
  "Santa Catalina",
  "Santa Cruz",
  "Santa Lucia (Poblacion)",
  "Santa Maria",
  "Santa Monica",
  "Santa Rita",
  "Santa Teresa 1st",
  "Santa Teresa 2nd",
  "Santiago",
  "Santo Domingo",
  "Santo Cristo",
  "Santo Niño (Prado Saba)",
  "Santo Tomas (Poblacion)",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">
      {children}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
      {...props}
    />
  );
}
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2 pt-1">
      <span className="text-brand-500">{icon}</span>
      <p className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">
        {title}
      </p>
    </div>
  );
}

function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: "", color: "", width: "0%" };
  if (pw.length < 8) return { label: "Too short", color: "bg-red-400", width: "20%" };
  const has = (r: RegExp) => r.test(pw);
  const score = [has(/[A-Z]/), has(/[0-9]/), has(/[^A-Za-z0-9]/), pw.length >= 12].filter(Boolean).length;
  if (score <= 1) return { label: "Weak",   color: "bg-orange-400", width: "40%" };
  if (score === 2) return { label: "Fair",   color: "bg-yellow-400", width: "60%" };
  if (score === 3) return { label: "Good",   color: "bg-blue-400",   width: "80%" };
  return                   { label: "Strong", color: "bg-brand-500",  width: "100%" };
}

interface FormState {
  username: string; email: string; password: string; confirm_password: string;
  first_name: string; middle_name: string; last_name: string; birthday: string;
  phone_number: string; house_street: string; barangay: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const [loading,        setLoading]        = useState(false);
  const [govIdPreview,   setGovIdPreview]   = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [govIdFile,      setGovIdFile]      = useState<File | null>(null);
  const [profileFile,    setProfileFile]    = useState<File | null>(null);
  const [showPassword,   setShowPassword]   = useState(false);

  const [form, setForm] = useState<FormState>({
    username: "", email: "", password: "", confirm_password: "",
    first_name: "", middle_name: "", last_name: "", birthday: "",
    phone_number: "", house_street: "", barangay: "",
  });

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  function onFile(e: React.ChangeEvent<HTMLInputElement>, type: "gov" | "profile") {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    if (type === "gov") { setGovIdFile(f); setGovIdPreview(url); }
    else                { setProfileFile(f); setProfilePreview(url); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm_password) { toast.error("Passwords do not match."); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (!form.barangay) { toast.error("Please select your barangay."); return; }
    if (!govIdFile) { toast.error("Government ID is required for identity verification."); return; }

    setLoading(true);
    const fd = new FormData();
    // Exclude confirm_password; construct city_province from locked value
    Object.entries(form).forEach(([k, v]) => {
      if (k !== "confirm_password") fd.set(k, v);
    });
    fd.set("city_province", "Lubao, Pampanga"); // locked
    fd.set("gov_id", govIdFile);
    if (profileFile) fd.set("profile_pic", profileFile);

    try {
      const res  = await fetch("/api/auth/register", { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Registered! Your account is pending admin verification.");
        router.push("/login");
      } else {
        toast.error(data.message ?? "Registration failed.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const pwStrength = getPasswordStrength(form.password);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 px-4 py-10">
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle compact />
      </div>

      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl
                          bg-brand-600 shadow-lg shadow-brand-500/30">
            <FiUserPlus size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white font-display">
            Create Account
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Lubao Community Share Hub
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card dark:bg-slate-900 shadow-md space-y-4">

          {/* ── Account ── */}
          <SectionHeader icon={<FiLock size={13} />} title="Account" />

          <div>
            <Label required>Username</Label>
            <Input value={form.username} onChange={set("username")}
              placeholder="your_username" required autoCapitalize="none"
              autoComplete="username" />
          </div>
          <div>
            <Label required>Email</Label>
            <Input value={form.email} onChange={set("email")}
              type="email" placeholder="you@email.com" required />
          </div>
          <div>
            <Label required>Password</Label>
            <div className="relative">
              <Input value={form.password} onChange={set("password")}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••" required className="pr-10" />
              <button type="button" tabIndex={-1}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {form.password && (
              <div className="mt-1.5 space-y-0.5">
                <div className="h-1 w-full rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pwStrength.color}`}
                    style={{ width: pwStrength.width }} />
                </div>
                <p className="text-[10px] text-gray-400">{pwStrength.label}</p>
              </div>
            )}
          </div>
          <div>
            <Label required>Confirm Password</Label>
            <Input value={form.confirm_password} onChange={set("confirm_password")}
              type="password" placeholder="••••••••" required />
          </div>

          {/* ── Personal Info ── */}
          <SectionHeader icon={<FiUserPlus size={13} />} title="Personal Info" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>First Name</Label>
              <Input value={form.first_name} onChange={set("first_name")}
                placeholder="Juan" required />
            </div>
            <div>
              <Label required>Last Name</Label>
              <Input value={form.last_name} onChange={set("last_name")}
                placeholder="Dela Cruz" required />
            </div>
          </div>
          <div>
            <Label>Middle Name</Label>
            <Input value={form.middle_name} onChange={set("middle_name")} placeholder="Optional" />
          </div>
          <div>
            <Label required>Birthday</Label>
            <Input value={form.birthday} onChange={set("birthday")} type="date" required />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input value={form.phone_number} onChange={set("phone_number")}
              type="tel" placeholder="09xxxxxxxxx" />
          </div>

          {/* ── Address ── */}
          <SectionHeader icon={<FiMapPin size={13} />} title="Address" />

          <div>
            <Label>House / Street</Label>
            <Input value={form.house_street} onChange={set("house_street")}
              placeholder="e.g. #12 Rizal St." />
          </div>

          {/* Barangay — radio button grid */}
          <div>
            <Label required>Barangay</Label>
            <p className="mb-2 text-[10px] text-gray-400 dark:text-slate-500">
              Select your barangay in Lubao, Pampanga
            </p>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200
                            dark:border-slate-700 p-3 bg-gray-50 dark:bg-slate-800">
              <div className="grid grid-cols-2 gap-1.5">
                {LUBAO_BARANGAYS.map((brgy) => (
                  <label
                    key={brgy}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2
                      text-xs transition-all
                      ${form.barangay === brgy
                        ? "border-brand-400 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-semibold"
                        : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-gray-300"}`}
                  >
                    <input
                      type="radio"
                      name="barangay"
                      value={brgy}
                      checked={form.barangay === brgy}
                      onChange={set("barangay")}
                      className="accent-brand-600 shrink-0"
                    />
                    <span className="truncate">{brgy}</span>
                  </label>
                ))}
              </div>
            </div>
            {form.barangay && (
              <p className="mt-1.5 text-xs text-brand-600 dark:text-brand-400 font-medium">
                ✓ Selected: {form.barangay}
              </p>
            )}
          </div>

          {/* Municipality — locked */}
          <div>
            <Label>Municipality</Label>
            <div className="input flex items-center gap-2 bg-gray-100 dark:bg-slate-800
                            border-gray-200 dark:border-slate-700 cursor-not-allowed">
              <FiLock size={12} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-500 dark:text-slate-400">Lubao, Pampanga</span>
            </div>
            <p className="mt-0.5 text-[10px] text-gray-400">
              This platform is exclusively for Lubao, Pampanga residents.
            </p>
          </div>

          {/* ── Identity Verification ── */}
          <SectionHeader icon={<FiLock size={13} />} title="Identity Verification" />

          <div>
            <Label required>Government-Issued ID</Label>
            <p className="mb-1.5 text-[10px] text-gray-400 dark:text-slate-500">
              Required for account verification (UMID, PhilSys, Driver's License, etc.)
            </p>
            <label className="block cursor-pointer">
              <input type="file" accept="image/*" onChange={(e) => onFile(e, "gov")} className="hidden" />
              <div className={`flex h-36 items-center justify-center rounded-xl border-2 border-dashed
                transition-colors overflow-hidden
                ${govIdPreview
                  ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20"
                  : "border-gray-200 dark:border-slate-700 hover:border-brand-300 bg-gray-50 dark:bg-slate-800"}`}>
                {govIdPreview
                  ? <img src={govIdPreview} alt="ID preview" className="h-full w-full object-cover" />
                  : <div className="flex flex-col items-center gap-1.5 text-gray-400">
                      <FiUpload size={22} />
                      <span className="text-xs font-medium">Upload Government ID</span>
                    </div>}
              </div>
            </label>
          </div>

          <div>
            <Label>Profile Photo (optional)</Label>
            <label className="block cursor-pointer">
              <input type="file" accept="image/*" onChange={(e) => onFile(e, "profile")} className="hidden" />
              <div className={`flex h-24 items-center justify-center rounded-xl border-2 border-dashed
                transition-colors overflow-hidden
                ${profilePreview
                  ? "border-brand-400"
                  : "border-gray-200 dark:border-slate-700 hover:border-brand-300 bg-gray-50 dark:bg-slate-800"}`}>
                {profilePreview
                  ? <img src={profilePreview} alt="Profile preview" className="h-full w-full object-cover" />
                  : <div className="flex flex-col items-center gap-1 text-gray-400">
                      <FiUpload size={18} />
                      <span className="text-xs">Profile Photo</span>
                    </div>}
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
          <Link href="/login"
            className="font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1">
            <FiArrowLeft size={12} /> Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
