// src/app/(user)/profile/page.tsx
// NEW PAGE: was returning 404. Shows the logged-in user's profile info.
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  birthday: string | null;
  phone_number: string | null;
  full_address: string | null;
  profile_pic: string | null;
  role: string;
  account_status: string;
  is_verified: number;
  created_at: string;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white">{value || <span className="text-gray-300 dark:text-slate-600">Not set</span>}</p>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userRes = await db.execute({
    sql: `SELECT id, username, email, first_name, middle_name, last_name,
                 birthday, phone_number, full_address, profile_pic,
                 role, account_status, is_verified, created_at
          FROM users WHERE id = ?`,
    args: [session.id],
  });
  if (userRes.rows.length === 0) redirect("/login");

  const user = { ...userRes.rows[0] } as unknown as UserProfile;

  // Item and borrow stats
  const [itemsRes, borrowsRes, notifRes, msgRes, pendRes] = await Promise.all([
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM items WHERE owner_id = ? AND is_active = 1", args: [session.id] }),
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM borrows WHERE borrower_id = ?", args: [session.id] }),
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0", args: [session.id] }),
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM messages WHERE receiver_id = ? AND is_read = 0", args: [session.id] }),
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM borrows WHERE owner_id = ? AND status = 'pending'", args: [session.id] }),
  ]);

  const statusColor = user.account_status === "active"
    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
    : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar
        session={session}
        unreadNotifs={Number((notifRes.rows[0] as { cnt: number }).cnt)}
        unreadMessages={Number((msgRes.rows[0] as { cnt: number }).cnt)}
        pendingRequests={Number((pendRes.rows[0] as { cnt: number }).cnt)}
      />

      <div className="flex flex-col flex-1 min-w-0 md:ml-64">
        <Header />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-5 space-y-5 max-w-2xl">

            {/* Profile card */}
            <div className="card flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar */}
              <div className="h-20 w-20 shrink-0 rounded-2xl overflow-hidden bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center">
                {user.profile_pic && !user.profile_pic.includes("default") ? (
                  <img src={user.profile_pic} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-brand-700 dark:text-brand-300">
                    {user.first_name[0]?.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name & badges */}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  {user.first_name} {user.middle_name ? `${user.middle_name} ` : ""}{user.last_name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">@{user.username}</p>
                <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                  <span className="badge bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 capitalize">{user.role}</span>
                  <span className={`badge ${statusColor} capitalize`}>{user.account_status}</span>
                  {user.is_verified === 1
                    ? <span className="badge bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">✓ Verified</span>
                    : <span className="badge bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">Pending Verification</span>
                  }
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card text-center">
                <p className="text-2xl font-black text-brand-600 dark:text-brand-400">
                  {Number((itemsRes.rows[0] as { cnt: number }).cnt)}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Items Posted</p>
              </div>
              <div className="card text-center">
                <p className="text-2xl font-black text-brand-600 dark:text-brand-400">
                  {Number((borrowsRes.rows[0] as { cnt: number }).cnt)}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Total Borrows</p>
              </div>
            </div>

            {/* Info */}
            <div className="card space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Account Info</h3>
              <Field label="Email"        value={user.email} />
              <Field label="Phone"        value={user.phone_number} />
              <Field label="Birthday"     value={user.birthday} />
              <Field label="Address"      value={user.full_address} />
              <Field label="Member Since" value={new Date(user.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })} />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
