"use client";
// src/app/(auth)/login/page.tsx
// ROOT CAUSE FIX: The original code did `router.push("/")` + `router.refresh()`.
// The refresh() fired a new server request before the Set-Cookie header was
// committed by the browser, causing getSession() to see no token → redirect
// to /login → infinite loop in Termux/mobile Chrome.
//
// FIX: The API now returns `redirectTo`. We use `window.location.href` for a
// full page reload. This guarantees the browser has stored the cookie before
// the next request hits, breaking the loop entirely.
import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { FiEye, FiEyeOff, FiLogIn, FiInfo } from "react-icons/fi";
import LoadingScreen from "@/components/loading/LoadingScreen";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function LoginPage() {
  const [loaded, setLoaded]     = useState(false);
  const [form, setForm]         = useState({ username: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleLoadComplete = useCallback(() => setLoaded(true), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error("Please enter your username and password.");
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();

      if (data.status === "success") {
        toast.success("Welcome back!");
        // FIX: Use full-page navigation so cookie is committed before next request.
        // router.push() + router.refresh() caused a race condition in mobile browsers.
        window.location.href = data.redirectTo ?? "/dashboard";
      } else {
        toast.error(data.message ?? "Login failed. Please try again.");
      }
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!loaded && <LoadingScreen onComplete={handleLoadComplete} duration={3000} />}

      <div
        className={`
          min-h-screen flex flex-col items-center justify-center
          bg-gray-50 dark:bg-slate-950
          px-4 py-10 transition-opacity duration-700
          ${loaded ? "opacity-100" : "opacity-0"}
        `}
      >
        {/* Controls — top right */}
        <div className="fixed top-4 right-4 flex items-center gap-2 z-10">
          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
          >
            <FiInfo size={15} />
            <span className="hidden sm:inline">About</span>
          </Link>
          <ThemeToggle compact />
        </div>

        <div className="w-full max-w-sm animate-slide-up">
          {/* Logo + Header */}
          <div className="mb-8 text-center">
            <div className="relative mx-auto mb-4 h-20 w-20">
              <div className="absolute inset-0 rounded-2xl bg-brand-500/20 blur-lg" />
              <div className="relative h-20 w-20 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                <Image
                  src="/assets/images/logo/lsh-logo.png"
                  alt="LSH Logo"
                  width={64}
                  height={64}
                  className="object-contain"
                  priority
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white font-display">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Lubao Community Share Hub</p>
          </div>

          <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Username</label>
                <input
                  className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                  placeholder="your_username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required autoComplete="username" autoCapitalize="none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Password</label>
                <div className="relative">
                  <input
                    className="input pr-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
                    {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                <FiLogIn size={16} />
                {loading ? "Logging in…" : "Log In"}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-gray-500 dark:text-slate-400">
            No account yet?{" "}
            <Link href="/register" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
              Register here
            </Link>
          </p>
        </div>

        <p className="mt-10 text-xs text-gray-400 dark:text-slate-600 text-center">
          © 2025 Lubao Community Share Hub · v2.0.0
        </p>
      </div>
    </>
  );
}
