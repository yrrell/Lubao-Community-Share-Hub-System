// src/app/(admin)/admin/users/page.tsx
// FIXED: removed `warning_count` column (not in real schema).
//        Serialised DB rows with spread to avoid "plain objects" React error.
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import UserManagementTable from "@/components/admin/UserManagementTable";
import type { User } from "@/types";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const res = await db.execute({
    // FIXED: removed warning_count — column does not exist in the real DB schema
    sql: `SELECT id, username, email, first_name, last_name,
                 gov_id_path, profile_pic, role,
                 account_status, is_verified, created_at
          FROM users
          ORDER BY created_at DESC`,
    args: [],
  });

  // FIXED: spread each row into a plain object to avoid Next.js serialisation error
  // "Only plain objects can be passed to Client Components from Server Components"
  const users = res.rows.map((r) => ({ ...r })) as unknown as User[];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} />

      <div className="flex flex-col flex-1 min-w-0 md:ml-64">
        <Header />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-5">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">User Management</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">{users.length} registered users</p>
            </div>
            <UserManagementTable users={users} />
          </div>
        </main>
      </div>
    </div>
  );
}
