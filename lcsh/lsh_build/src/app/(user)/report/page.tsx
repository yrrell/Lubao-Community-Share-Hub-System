"use client";
// src/app/(user)/report/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import ReportForm from "@/components/report/ReportForm";

export default async function ReportPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-5 pt-14 md:pt-5 max-w-xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Report an Incident</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Submit a report about a tool issue, harassment, or account appeal. Admin will review within 24–48 hours.
            </p>
          </div>
          <div className="card">
            <ReportForm />
          </div>
        </div>
      </main>
    </div>
  );
}
