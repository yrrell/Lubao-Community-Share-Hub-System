// src/hooks/useSession.ts
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser, UserRole } from "@/types";

export function useSession(requiredRole?: UserRole) {
  const router  = useRouter();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (cancelled) return;

        if (!res.ok) {
          window.location.href = "/login";
          return;
        }

        // ✅ FIX: Unwrap the ApiResponse envelope — role lives at json.data.user
        const json = await res.json();
        if (cancelled) return;

        const user: SessionUser = json?.data?.user;

        if (!user || !user.role) {
          window.location.href = "/login";
          return;
        }

        // Role mismatch
        if (requiredRole && user.role !== requiredRole) {
          window.location.href =
            user.role === "admin" ? "/admin/dashboard" : "/dashboard";
          return;
        }

        setSession(user);
      } catch {
        if (!cancelled) window.location.href = "/login";
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [requiredRole, router]);

  return { session, loading };
}