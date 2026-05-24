"use client";
// src/app/(auth)/register/page.tsx
// UPDATED:
//   - Municipality locked to "Lubao, Pampanga"
//   - Barangay replaced with radio-button grid for all 44 barangays of Lubao
//   - Improved layout with clear sections
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FiUpload, FiUserPlus, FiArrowLeft, FiMapPin } from "react-icons/fi";
import ThemeToggle from "@/components/ui/ThemeToggle";

// All 44 barangays of Lubao, Pampanga
const LUBAO_BARANGAYS = [
  "Balantacan",
  "Bancal Pugad",
  "Bancal Sinubli",
  "Baruya (San Jose)",
  "Batasan Bata",
  "Batasan Matua",
  "Calangain",
  "Cangatba",
  "Cawi",
  "Concepcion (Assumption)",
  "Dalayap",
  "Liozon Bata",
  "Liozon Matua",
  "Maliwalu",
  "Pias",
  "Pitabunan",
  "San Antonio",
  "San Isidro",
  "San Jose Matulid",
  "San Juan Bano",
  "San Juan Lewa",
  "San Nicolas 1st",
  "San Nicolas 2nd",
  "San Pablo 1st",
  "San Pablo 2nd",
  "San Pedro Palcarangan",
  "San Pedro Saug",
  "San Roque",
  "Santa Catalina",
  "Santa Cruz",
  "Santa Lucia",
  "Santa Maria",
  "Santa Ursula",
  "Santo Cristo",
  "Santo Domingo",
  "Santo Niño",
  "Santo Tomas",
  "Sulipan",
  "Tabun",
  "San Agustin",
  "San Vicente",
  "Poblacion (Lubao)",
  "San Fernando",
  "San Miguel",
] as const;

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
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

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0">
      <Icon size={14} className="text-brand-500" />
      <p className="text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">
        {title}
      </p>
    </div>
  );
}

interface FormState {
  username: string; email: string; password: string; confirm_password: string;
  first_name: string; middle_name: string; last_name: string; birthday: string;
  phone_number: string; house_street: string; barangay: string;
}

export default function RegisterPage() {
  const router  = useRouter();
  const [loading, setLoading]           = useState(false);
  const [govIdPreview, setGovIdPreview] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [govIdFile, setGovIdFile]       = useState<File | null>(null);
  const [profileFile, setProfileFile]   = useState<File | null>(null);
  const [showPass, setShowPass]         = useState(false);
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
    else { setProfileFile(f); setProfilePreview(url); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!form.barangay) {
      toast.error("Please select your barangay.");
      return;
    }
    if (!govIdFile) {
      toast.error("Government ID is required.");
      return;
    }
    setLoading(true);

    const fd = new FormData();
    // Merge house/street + barangay + fixed municipality into full_address
    const fullAddress = `${form.house_street}, Brgy. ${form.barangay}, Lubao, Pampanga`;
    Object.entries(form).forEach(([k, v]) => {
      if (k !== "confirm_password" && k !== "house_street" && k !== "barangay") {
        fd.set(k, v);
      }
    });
    fd.set("full_address", fullAddress);
    fd.set("gov_id", govIdFile);
    if (profileFile) fd.set("profile_pic", profileFile);

    try {
      const res  = await fetch("/api/auth/register", { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Account created! Awaiting admin verification.");
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 px-4 py-10">
      {/* Top bar */}
      <div className="fixed top-4 left-4 right-4 flex items-center justify-between z-10">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
        >
          <FiArrowLeft size={14} /> Back
        </button>
        <ThemeToggle compact />
      </div>

      <div className="mx-auto max-w-lg pt-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-900/30">
            <FiUserPlus size={24} className="text-brand-600 dark:text-brand-400" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Create Account</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Lubao Community Share Hub</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-0">
          {/* ── ACCOUNT ──────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm mb-4">
            <SectionHeader icon={FiUserPlus} title="Account" />
            <div className="space-y-4">
              <div>
                <Label required>Username</Label>
                <Input placeholder="your_username" value={form.username} onChange={set("username")}
                  required autoCapitalize="none" autoComplete="username" />
              </div>
              <div>
                <Label required>Email</Label>
                <Input type="email" placeholder="you@email.com" value={form.email} onChange={set("email")}
                  required autoComplete="email" />
              </div>
              <div>
                <Label required>Password</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={set("password")}
                    required minLength={8}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <Label required>Confirm Password</Label>
                <Input type="password" placeholder="Repeat password" value={form.confirm_password}
                  onChange={set("confirm_password")} required />
              </div>
            </div>
          </div>

          {/* ── PERSONAL INFO ─────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm mb-4">
            <SectionHeader icon={FiUserPlus} title="Personal Info" />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>First Name</Label>
                  <Input placeholder="Juan" value={form.first_name} onChange={set("first_name")} required />
                </div>
                <div>
                  <Label required>Last Name</Label>
                  <Input placeholder="Dela Cruz" value={form.last_name} onChange={set("last_name")} required />
                </div>
              </div>
              <div>
                <Label>Middle Name</Label>
                <Input placeholder="Optional" value={form.middle_name} onChange={set("middle_name")} />
              </div>
              <div>
                <Label>Birthday</Label>
                <Input type="date" value={form.birthday} onChange={set("birthday")} />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input type="tel" placeholder="09XXXXXXXXX" value={form.phone_number} onChange={set("phone_number")} />
              </div>
            </div>
          </div>

          {/* ── ADDRESS ───────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm mb-4">
            <SectionHeader icon={FiMapPin} title="Address" />
            <div className="space-y-4">
              {/* Municipality — locked */}
              <div>
                <Label>Municipality / City</Label>
                <div className="input bg-gray-50 dark:bg-slate-700 text-gray-400 dark:text-slate-400 cursor-not-allowed select-none">
                  Lubao, Pampanga
                </div>
                <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">
                  This app is exclusive to Lubao residents.
                </p>
              </div>

              {/* House / Street */}
              <div>
                <Label>House No. / Street</Label>
                <Input placeholder="e.g. 123 Rizal St." value={form.house_street} onChange={set("house_street")} />
              </div>

              {/* Barangay — radio buttons */}
              <div>
                <Label required>Barangay</Label>
                <p className="mb-3 text-[11px] text-gray-400 dark:text-slate-500">
                  Select your barangay in Lubao, Pampanga
                </p>

                {/* Search-friendly scrollable grid */}
                <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700 p-3">
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {LUBAO_BARANGAYS.map((brgy) => (
                      <label
                        key={brgy}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all
                          ${form.barangay === brgy
                            ? "border-brand-400 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                            : "border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:border-brand-300 hover:bg-brand-50/50"
                          }`}
                      >
                        <input
                          type="radio"
                          name="barangay"
                          value={brgy}
                          checked={form.barangay === brgy}
                          onChange={() => setForm((prev) => ({ ...prev, barangay: brgy }))}
                          className="accent-brand-600 h-3.5 w-3.5 shrink-0"
                        />
                        <span className="leading-snug">{brgy}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {form.barangay && (
                  <p className="mt-2 text-xs text-brand-600 dark:text-brand-400 font-medium">
                    ✓ Selected: Brgy. {form.barangay}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── DOCUMENTS ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm mb-6">
            <SectionHeader icon={FiUpload} title="Documents" />
            <div className="space-y-4">
              {/* Gov ID */}
              <div>
                <Label required>Government ID</Label>
                <p className="mb-2 text-[11px] text-gray-400 dark:text-slate-500">
                  Required for identity verification (will be reviewed by admin).
                </p>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-6 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-900/10">
                  {govIdPreview ? (
                    <img src={govIdPreview} alt="ID preview" className="max-h-28 rounded-lg object-contain" />
                  ) : (
                    <>
                      <FiUpload size={22} className="text-gray-300 dark:text-slate-600" />
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        Click to upload Gov&apos;t ID
                      </span>
                    </>
                  )}
                  <input type="file" accept="image/*,.pdf" className="sr-only"
                    onChange={(e) => onFile(e, "gov")} />
                </label>
              </div>

              {/* Profile Picture */}
              <div>
                <Label>Profile Picture</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-6 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-900/10">
                  {profilePreview ? (
                    <img src={profilePreview} alt="Profile preview" className="h-20 w-20 rounded-full object-cover" />
                  ) : (
                    <>
                      <FiUpload size={22} className="text-gray-300 dark:text-slate-600" />
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        Click to upload profile photo (optional)
                      </span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="sr-only"
                    onChange={(e) => onFile(e, "profile")} />
                </label>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            <FiUserPlus size={18} />
            {loading ? "Creating account…" : "Create Account"}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500 dark:text-slate-400 pb-10">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
              Log In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
