// src/app/(user)/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import Link from "next/link";

const BARANGAYS = [
  "Balantacan","Bancal","Barugo","Batang 1st","Batang 2nd","Bebe Anac","Bebe Matua",
  "Calangain","Candating","Dalayap","Diente","Estipona","Lourdes","Mabuanbuan",
  "Malusac","Masantol","Matukol","Miasian","Muti","Pansinao","Paralaya","Pias",
  "Pitpot","Polilio","San Agustin","San Antonio","San Isidro","San Jose","San Nicolas 1st",
  "San Nicolas 2nd","San Pablo","San Pedro","San Ramon","San Roque","Sta. Catalina",
  "Sta. Cruz","Sto. Cristo","Sto. Tomas","Sulipan","Tabun","Tetuan",
  "Tibaguin","Tiling","Tortugas",
];

interface ToolRow {
  id: number;
  name: string;
  description: string;
  image_url: string | null;
  status: string;
  payment_method: string;
  barangay: string | null;
  owner_id: number;
  owner_name: string;
  owner_username: string;
  owner_pic: string | null;
  borrow_type?: string;
  fee?: number;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; brgy?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "admin") redirect("/admin/dashboard");

  const { tab = "all", q = "", brgy = "" } = await searchParams;

  const payFilter = tab === "free" ? "AND t.payment_method='free'"
    : tab === "cash"  ? "AND t.payment_method='cash'"
    : tab === "gcash" ? "AND t.payment_method='gcash'"
    : "";

  const toolsRes = await db.execute({
    sql: `SELECT t.*,
            u.first_name || ' ' || u.last_name AS owner_name,
            u.username AS owner_username,
            u.profile_pic AS owner_pic,
            u.full_address AS barangay
          FROM tools t
          JOIN users u ON u.id = t.owner_id
          WHERE t.approval_status = 'approved'
            AND t.status = 'available'
            AND t.owner_id != ?
            ${payFilter}
            AND (? = '' OR t.name LIKE '%' || ? || '%' OR t.description LIKE '%' || ? || '%')
            AND (? = '' OR u.full_address LIKE '%' || ? || '%')
          ORDER BY t.created_at DESC`,
    args: [session.id, q, q, q, brgy, brgy],
  });

  const [notifsRes, messagesRes, pendingRes] = await Promise.all([
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id=? AND is_read=0", args: [session.id] }),
    db.execute({ sql: "SELECT COUNT(*) AS cnt FROM messages WHERE receiver_id=? AND is_read=0", args: [session.id] }),
    db.execute({ sql: `SELECT COUNT(*) AS cnt FROM transactions t JOIN tools tl ON tl.id=t.tool_id WHERE tl.owner_id=? AND t.status='pending'`, args: [session.id] }),
  ]);

  const tools    = toolsRes.rows as unknown as ToolRow[];
  const unreadN  = Number((notifsRes.rows[0]   as { cnt: number }).cnt);
  const unreadM  = Number((messagesRes.rows[0] as { cnt: number }).cnt);
  const pending  = Number((pendingRes.rows[0]  as { cnt: number }).cnt);

  const TABS = [
    { key: "all",   label: "All Tools" },
    { key: "free",  label: "Free 🎁" },
    { key: "cash",  label: "Cash 💵" },
    { key: "gcash", label: "GCash 📱" },
  ];

  const payBadge: Record<string, string> = {
    free:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    cash:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    gcash: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar session={session} unreadNotifs={unreadN} unreadMessages={unreadM} pendingRequests={pending} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-5 pt-14 md:pt-5 space-y-5">

          {/* Search + Barangay Filter */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Find Tools</h2>
            <form className="flex gap-2 flex-wrap">
              <input name="tab"  type="hidden" value={tab} />
              <input name="q"    defaultValue={q}    placeholder="Search tools…"         className="input text-sm py-2 flex-1 min-w-[180px]" />
              <select name="brgy" defaultValue={brgy} className="input text-sm py-2 w-52">
                <option value="">All 44 Barangays</option>
                {BARANGAYS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary text-sm py-2 px-4">🔍 Search</button>
            </form>
          </div>

          {/* Payment Filter Tabs */}
          <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-slate-800 p-1 w-fit">
            {TABS.map((t) => (
              <a key={t.key}
                href={`/dashboard?tab=${t.key}${q ? `&q=${q}` : ""}${brgy ? `&brgy=${brgy}` : ""}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  tab === t.key
                    ? "bg-white dark:bg-slate-900 shadow text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                }`}>
                {t.label}
              </a>
            ))}
          </div>

          {/* Results count */}
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {tools.length} tool{tools.length !== 1 ? "s" : ""} available
          </p>

          {/* Tool Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tools.map((tool) => (
              <div key={tool.id} className="card group flex flex-col gap-3 hover:shadow-md transition-shadow">
                {/* Image */}
                <div className="h-40 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 relative">
                  {tool.image_url
                    ? <img src={tool.image_url} alt={tool.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="h-full w-full flex items-center justify-center text-5xl text-gray-300 dark:text-slate-600">🔧</div>
                  }
                  <span className={`absolute top-2 right-2 badge text-xs ${payBadge[tool.payment_method] ?? "bg-gray-100 text-gray-500"}`}>
                    {tool.payment_method === "free" ? "FREE" :
                     tool.payment_method === "gcash" ? "GCash" : "Cash"}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white">{tool.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">{tool.description}</p>
                </div>

                {/* Owner */}
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-brand-100 dark:bg-brand-900/50 overflow-hidden shrink-0">
                    {tool.owner_pic
                      ? <img src={`/${tool.owner_pic}`} alt="" className="h-full w-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-300">{tool.owner_username[0].toUpperCase()}</div>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 truncate">@{tool.owner_username}</p>
                    {tool.barangay && (
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                        📍 {tool.barangay.split(",")[0]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Borrow Button */}
                <Link href={`/tools/${tool.id}`}
                  className="btn-primary w-full text-sm text-center py-2">
                  Request to Borrow
                </Link>
              </div>
            ))}
          </div>

          {tools.length === 0 && (
            <div className="card text-center py-16 text-gray-400 dark:text-slate-500">
              <p className="text-5xl mb-3">🔍</p>
              <p className="font-medium text-lg">No tools found</p>
              <p className="text-sm mt-1">Try a different search or barangay filter.</p>
              <Link href="/tools" className="btn-primary mt-4 inline-flex">Post a Tool Instead</Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
