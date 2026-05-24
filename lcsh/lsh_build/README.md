# 🌿 Lubao Community Share Hub — v3.0 Project Update
> **Date:** May 2025 | **Stack:** Next.js 15 · TypeScript · Tailwind CSS · Turso/libSQL · Nodemailer

---

## ✅ Current Status: Active Development — Major Feature Push Complete

---

## 🚀 Recent Progress (v2.x → v3.0)

### 🛡 Admin Side — Completed
| Feature | Status | Notes |
|---|---|---|
| Secure Admin Login (brute-force guard) | ✅ Done | 5 attempts → 10-min lockout, all events logged |
| Admin Dashboard with pending approvals | ✅ Done | KPI cards, pending registrations widget, recent activity |
| User Management (verify/suspend/delete) | ✅ Done | Tab filtering: All / Pending / Suspended, ID photo review |
| Tool Inventory (approve/decline/toggle) | ✅ Done | Card grid with image previews, status management |
| Reports & Appeals (resolve/dismiss) | ✅ Done | Tab filtering, resolution notes, evidence photo preview |
| Security Logs & Admin Accounts | ✅ Done | Failed attempts, lockout status, add/reset/delete admins |
| Admin Profile & Password Change | ✅ Done | Secure bcrypt update with current password verification |

### 👤 User Side — Completed
| Feature | Status | Notes |
|---|---|---|
| Registration with ID + Photo upload | ✅ Done | FormData upload, stored to `/public/uploads/` |
| Find Tools (44 Barangays filter) | ✅ Done | Payment tabs (All/Free/Cash/GCash), search, barangay filter |
| Tool Detail + Borrow Request | ✅ Done | Payment ref, screenshot upload, self-borrow prevention |
| Transaction Manager / Lender Tasks | ✅ Done | Incoming + outgoing split view, approve/decline/return |
| Borrowing Agreement / PDF | ✅ Done | Printable agreement with signatures, payment status |
| Messenger-style Chat | ✅ Done | Conversation list, real-time polling (5s), read receipts |
| Notifications with mark-as-read | ✅ Done | Batch + individual mark-read, type-based icons |
| Post a Tool | ✅ Done | Rich form: condition, known issues (sealed), service type, landmark |
| User Profile (locked fields + security) | ✅ Done | ID-verified badge, violations count, password change |
| Report / Appeal submission | ✅ Done | 7 issue types, evidence photo, admin notification |

### 🔌 API & Security — Completed
| Feature | Status | Notes |
|---|---|---|
| JWT auth (httpOnly cookie) | ✅ Done | 7-day expiry, HS256 |
| Admin brute-force lockout | ✅ Done | Separate `admins` table, `security_logs` audit trail |
| File upload validation | ✅ Done | MIME check, 5MB limit, random filename |
| Role-based middleware | ✅ Done | Admin ↔ user redirect, token verification on every request |
| Email alerts (login + approval) | ✅ Done | Nodemailer, Gmail SMTP, non-blocking |
| All DB queries parameterised | ✅ Done | No SQL injection vectors via Turso SDK |

---

## 📁 Project Structure

```
lsh_project/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx          — Shared login (user + admin)
│   │   │   └── register/page.tsx       — Registration + ID upload
│   │   ├── (admin)/admin/
│   │   │   ├── dashboard/page.tsx      — Admin overview + approvals
│   │   │   ├── users/page.tsx          — User management
│   │   │   ├── tools/page.tsx          — Tool inventory
│   │   │   ├── reports/page.tsx        — Reports & appeals
│   │   │   ├── security/page.tsx       — Security logs
│   │   │   └── profile/page.tsx        — Admin profile
│   │   ├── (user)/
│   │   │   ├── dashboard/page.tsx      — Find Tools
│   │   │   ├── tools/page.tsx          — Post a Tool
│   │   │   ├── tools/[id]/page.tsx     — Tool detail + borrow
│   │   │   ├── my-requests/page.tsx    — Transaction manager
│   │   │   ├── agreement/[id]/page.tsx — Borrowing PDF
│   │   │   ├── chat/page.tsx           — Messenger
│   │   │   ├── notifications/page.tsx  — Notifications
│   │   │   ├── profile/page.tsx        — Account settings
│   │   │   └── report/page.tsx         — Report / appeal
│   │   ├── api/
│   │   │   ├── auth/{login,register,logout}/
│   │   │   ├── tools/{route,[id]/route}
│   │   │   ├── transactions/{route,[id]/route}
│   │   │   ├── messages/route
│   │   │   ├── notifications/route
│   │   │   ├── reports/route
│   │   │   ├── profile/avatar/route
│   │   │   └── admin/security/route
│   │   ├── globals.css                 — Tailwind + component classes
│   │   └── layout.tsx                  — Root layout + ThemeProvider
│   ├── components/
│   │   ├── layout/Sidebar.tsx          — Collapsible sidebar + logout
│   │   ├── chat/ChatWindow.tsx         — Client chat with polling
│   │   ├── tools/BorrowRequestForm.tsx — Borrow form with payment
│   │   ├── report/ReportForm.tsx       — Report/appeal form
│   │   ├── ui/ThemeToggle.tsx          — Dark/light toggle
│   │   └── loading/LoadingScreen.tsx   — Splash screen
│   ├── contexts/ThemeContext.tsx       — Dark mode provider
│   ├── lib/
│   │   ├── auth.ts                     — JWT helpers + session
│   │   ├── db.ts                       — Turso client + schema
│   │   └── email.ts                    — Nodemailer + templates
│   ├── middleware.ts                   — Auth + role guard
│   └── types/index.ts                 — Global TypeScript types
├── SYSTEM_FLOWCHART.html               — Interactive flowchart
├── migrate.js                          — DB migration + seed script
├── tailwind.config.ts                  — Brand-500 green theme
├── .env.local.example                  — Environment template
└── package.json                        — v3.0.0
```

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.local.example .env.local
# Fill in TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, JWT_SECRET, EMAIL_* vars
```

### 3. Initialise the database
```bash
node migrate.js
# Creates all tables and a default admin: lerry / admin@LSH2025
# ⚠️ Change the admin password immediately after first login!
```

### 4. Run development server
```bash
npm run dev
# Open http://localhost:3000
```

---

## 🔐 Default Admin Credentials
| Field | Value |
|---|---|
| Username | `lerry` |
| Password | `admin@LSH2025` |
| **⚠️ Change immediately** | Login → `/admin/profile` → Change Password |

---

## 📋 Next Steps (Roadmap)

### Priority 1 — High Impact
- [ ] **WebSocket / SSE for chat** — Replace 5s polling with real-time push (Pusher, Ably, or Next.js Route Handlers with `ReadableStream`)
- [ ] **Email on registration approval** — Send approval/rejection email via Nodemailer when admin verifies user
- [ ] **Tool image upload** — Add file input to the Post a Tool form, store to `/uploads/tools/`
- [ ] **Admin Add New Admin modal** — `/admin/security/new` page with form → POST `/api/admin/security`

### Priority 2 — Enhancement
- [ ] **Barangay dropdown on registration** — Match the 44 barangays used in Find Tools filter
- [ ] **Borrowing due date + overdue alerts** — Add `due_date` to transactions, cron-style check on API calls
- [ ] **Reviews & Ratings** — Post-return review form (1–5 stars), display on tool and user profiles
- [ ] **Tool categories** — Add category filter to Find Tools alongside payment type
- [ ] **Admin Dashboard charts** — Monthly borrows, active users, top tools (Recharts)

### Priority 3 — Polish
- [ ] **PWA manifest** — Add `manifest.json` + service worker for offline support on mobile
- [ ] **Pagination** — Add limit/offset to Find Tools and admin tables for large datasets
- [ ] **Admin bulk actions** — Select multiple users/tools for batch verify/approve
- [ ] **Export tools/users as CSV** — Admin reports export

---

## 🗄 Database Tables

| Table | Purpose |
|---|---|
| `users` | Community members with verification status |
| `admins` | Admin accounts (separate, with lockout tracking) |
| `tools` | Tool listings with approval workflow |
| `transactions` | Borrow requests and their lifecycle |
| `notifications` | Per-user notification feed |
| `reports` | Incident reports and account appeals |
| `messages` | Direct messages between users |
| `security_logs` | Audit trail for all login events |

---

## 🎨 Design System
- **Brand Color:** `brand-600` = `#16a34a` (green)
- **Font:** Plus Jakarta Sans (body) + Sora (display/headings)
- **Components:** `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input`, `.card`, `.badge`, `.sidebar-link`
- **Dark Mode:** Class-based (`dark:` prefix), persisted to `localStorage`

---

*Built for the residents of Lubao, Pampanga · Community Share Hub v3.0*
