# Lubao Community Share Hub — Migration & Update Guide

**Version 2.0 | PHP → Next.js / TypeScript / Turso**
**Prepared for:** Developers & System Administrators
**System Name:** Lubao Community Share Hub (LSH)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Comparison](#2-architecture-comparison)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Step-by-Step Setup Guide](#5-step-by-step-setup-guide)
6. [Database Migration](#6-database-migration)
7. [Environment Configuration](#7-environment-configuration)
8. [Feature Flowcharts](#8-feature-flowcharts)
9. [API Reference](#9-api-reference)
10. [Deployment Guide (Vercel)](#10-deployment-guide-vercel)
11. [Developer Notes](#11-developer-notes)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. System Overview

**Lubao Community Share Hub** is a community tool-lending web platform for residents of Lubao, Pampanga. It allows verified community members to post tools they own, browse available tools from neighbours, and submit borrow requests — with optional GCash payment support and an admin moderation layer.

### Core Features
| Feature | Description |
|---|---|
| User Registration | Multi-step signup with gov ID + profile photo upload |
| Admin Verification | Admin manually verifies user identity documents |
| Tool Listing | Verified users post tools; admin approves before listing |
| Borrow Request | Users send borrow requests; tool owners approve or decline |
| GCash Anti-Scam | Reference ID cross-check before approving GCash payments |
| Notifications | In-app alerts + Gmail email notifications |
| Chat / Messaging | Direct messaging between users |
| Reports | Users can report issues with evidence photos |
| Admin Panel | User management, tool inventory, transaction history, security logs |

---

## 2. Architecture Comparison

### Old Architecture (PHP / MySQL)

```
[Browser HTML]
    │
    ├── templates/*.php  ←── PHP template files (UI + logic mixed)
    │       │
    │       └── php/*.php  ←── PHP scripts (API handlers)
    │               │
    │               ├── db.php  ←── PDO MySQL connection
    │               ├── auth.php ←── Session-based auth + PHPMailer
    │               └── ...
    │
[MySQL Database] (local XAMPP server)
[Local Filesystem] (uploads stored on XAMPP server)
```

**Limitations:**
- PHP sessions — not scalable horizontally
- MySQL on XAMPP — local-only, not cloud-native
- No TypeScript — no type safety
- Mixed concerns (UI logic inside PHP templates)
- No build pipeline or modern tooling

---

### New Architecture (Next.js / Turso)

```
[React UI Components]  ←── Client-side interactivity
    │
    ├── Next.js App Router ←── Pages + Layouts (Server Components)
    │       │
    │       └── /api/* Route Handlers ←── REST API (JSON)
    │               │
    │               ├── lib/db.ts  ←── Turso (libSQL) client
    │               ├── lib/auth.ts ←── JWT + cookie auth
    │               └── lib/email.ts ←── Nodemailer
    │
[Turso Database] (cloud SQLite, globally distributed)
[/public/uploads/] (local filesystem, or swap for Cloudinary)
[Vercel] (edge deployment)
```

**Improvements:**
- JWT cookies — stateless, scalable
- Turso — cloud SQLite, always-on, Vercel-compatible
- Full TypeScript — type safety throughout
- Server + Client Components — optimal rendering strategy
- Tailwind CSS — utility-first, mobile-first design
- Fixed viewport — no zoom on mobile

---

## 3. Technology Stack

| Layer | Old (v1) | New (v2) |
|---|---|---|
| Framework | PHP 8 + raw HTML templates | Next.js 15 (App Router) |
| Language | PHP + HTML/JS | TypeScript (primary) |
| Styling | Bootstrap 5 + custom CSS | Tailwind CSS 3 |
| Database | MySQL (XAMPP / Supabase) | Turso (libSQL, cloud SQLite) |
| Auth | PHP Sessions | JWT (jose) via HttpOnly cookie |
| Email | PHPMailer (Gmail SMTP) | Nodemailer (Gmail SMTP) |
| File Uploads | PHP move_uploaded_file | Next.js FormData + fs/promises |
| Deployment | XAMPP / shared hosting | Vercel |
| API Format | Mixed (form POST + PHP echo) | JSON REST API |

---

## 4. Project Structure

```
lsh-nextjs/
│
├── src/
│   ├── app/
│   │   ├── layout.tsx            ← Root HTML shell (fixed viewport)
│   │   ├── globals.css           ← Tailwind + custom utilities
│   │   ├── page.tsx              ← Root redirect (/ → /dashboard or /admin/dashboard)
│   │   │
│   │   ├── (auth)/               ← Auth pages (no sidebar)
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   │
│   │   ├── (user)/               ← User pages (with sidebar)
│   │   │   ├── dashboard/page.tsx    ← Browse available tools
│   │   │   ├── tools/page.tsx        ← Post a new tool
│   │   │   ├── my-requests/page.tsx  ← Lender tasks + borrow history
│   │   │   ├── profile/page.tsx      ← User profile management
│   │   │   ├── notifications/page.tsx
│   │   │   └── chat/page.tsx
│   │   │
│   │   ├── (admin)/              ← Admin pages (with sidebar)
│   │   │   └── admin/
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── tools/page.tsx
│   │   │       ├── users/page.tsx
│   │   │       └── reports/page.tsx
│   │   │
│   │   └── api/                  ← REST API route handlers
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── register/route.ts
│   │       │   └── logout/route.ts
│   │       ├── tools/
│   │       │   ├── route.ts          ← GET (list), POST (create)
│   │       │   └── [id]/route.ts     ← PATCH (approve/hide), DELETE
│   │       ├── transactions/
│   │       │   ├── route.ts          ← GET (list), POST (borrow request)
│   │       │   └── [id]/route.ts     ← PATCH (approve/decline)
│   │       ├── users/
│   │       │   ├── route.ts          ← GET (admin list)
│   │       │   └── [id]/route.ts     ← PATCH (verify/suspend/warn)
│   │       ├── notifications/route.ts
│   │       ├── reports/route.ts
│   │       └── messages/route.ts
│   │
│   ├── lib/
│   │   ├── db.ts          ← Turso client + schema init
│   │   ├── auth.ts        ← JWT sign/verify + cookie helpers
│   │   └── email.ts       ← Nodemailer + HTML email templates
│   │
│   ├── middleware.ts       ← Route protection (JWT check)
│   │
│   ├── types/
│   │   └── index.ts       ← All TypeScript interfaces & types
│   │
│   └── components/
│       ├── layout/
│       │   └── Sidebar.tsx        ← Collapsible sidebar (user + admin)
│       ├── tools/
│       │   ├── ToolCard.tsx       ← Tool display + borrow modal
│       │   └── RequestCard.tsx    ← Lender approve/decline card
│       └── admin/
│           └── UserManagementTable.tsx
│
├── public/
│   └── uploads/           ← User-uploaded files (IDs, tools, payments, evidence)
│       ├── ids/
│       ├── profiles/
│       ├── tools/
│       ├── payments/
│       ├── evidence/
│       └── defaults/      ← Placeholder images
│
├── .env.example           ← Environment variable template
├── .env.local             ← Your actual env vars (never commit this)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
└── package.json
```

---

## 5. Step-by-Step Setup Guide

### Prerequisites

Before starting, make sure you have:

- **Node.js 20+** → [nodejs.org](https://nodejs.org)
- **npm 10+** (comes with Node)
- **Git** → [git-scm.com](https://git-scm.com)
- **Turso CLI** → `npm install -g @tursodatabase/cli`
- **A Gmail account** with 2FA enabled (for email)
- **Vercel account** (free) → [vercel.com](https://vercel.com)

---

### Step 1 — Clone or Extract the Project

```bash
# If using the provided zip file:
unzip lsh-nextjs.zip -d lsh-nextjs
cd lsh-nextjs

# OR if using git:
git clone https://your-repo-url.git lsh-nextjs
cd lsh-nextjs
```

---

### Step 2 — Install Dependencies

```bash
npm install
```

Expected output: a `node_modules/` folder with all packages installed.

---

### Step 3 — Set Up Turso Database

**3a. Log in to Turso**
```bash
turso auth login
```
This opens a browser; log in with GitHub or email.

**3b. Create a new database**
```bash
turso db create lubao-share-hub
```

**3c. Get your database URL**
```bash
turso db show lubao-share-hub
# Copy the "URL" value → looks like:
# libsql://lubao-share-hub-yourname.turso.io
```

**3d. Create an auth token**
```bash
turso db tokens create lubao-share-hub
# Copy the token — you only see it once!
```

---

### Step 4 — Configure Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```env
# Turso
TURSO_DATABASE_URL=libsql://lubao-share-hub-yourname.turso.io
TURSO_AUTH_TOKEN=your-turso-token-here

# JWT (generate with: openssl rand -base64 64)
JWT_SECRET=paste-your-64-char-random-string-here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Gmail SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=lubaocommunitysharehub@gmail.com
EMAIL_PASS=your-16-char-app-password
EMAIL_FROM="Lubao Share Hub <lubaocommunitysharehub@gmail.com>"
```

**How to create a Gmail App Password:**
1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already
3. Search "App Passwords" → Create one for "Mail"
4. Copy the 16-character password into `EMAIL_PASS`

---

### Step 5 — Initialise the Database Schema

Open the Turso shell and paste the schema:

```bash
turso db shell lubao-share-hub
```

Then run the SQL from `src/lib/db.ts` (the `initSchema()` function contains all CREATE TABLE statements). Copy and paste each block into the shell.

**OR** run programmatically:
```bash
npx ts-node -e "const {initSchema} = require('./src/lib/db'); initSchema()"
```

---

### Step 6 — Create Default Upload Folders

```bash
mkdir -p public/uploads/{ids,profiles,tools,payments,evidence,defaults}
```

Copy your default placeholder images to `public/uploads/defaults/`:
- `default-user.png`
- `default-tool.png`

---

### Step 7 — Create the First Admin Account

Open the Turso shell:
```bash
turso db shell lubao-share-hub
```

Insert an admin (replace values):
```sql
INSERT INTO admins (username, email, password_hash)
VALUES (
  'admin',
  'admin@example.com',
  '$2a$12$HASH_PLACEHOLDER'
);
```

To generate a bcrypt hash for your password, run:
```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('YourPassword123!',12))"
```
Then paste the hash into the SQL above.

---

### Step 8 — Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- Visit `/login` to log in as admin or user
- Visit `/register` to create a new user account

---

## 6. Database Migration

### Schema Reference

All tables are SQLite-compatible (Turso uses libSQL, a SQLite fork).

```sql
-- Core tables (run in Turso shell to initialise)

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  birthday TEXT NOT NULL,
  phone_number TEXT,
  full_address TEXT,
  gov_id_path TEXT,
  profile_pic TEXT DEFAULT 'uploads/defaults/default-user.png',
  role TEXT NOT NULL DEFAULT 'user',
  account_status TEXT NOT NULL DEFAULT 'active',
  is_verified INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  profile_pic TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'available',
  approval_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id INTEGER NOT NULL REFERENCES tools(id),
  borrower_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  approval_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'free',
  payment_ref TEXT,
  payment_screenshot TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  related_id INTEGER,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  issue_type TEXT NOT NULL,
  details TEXT NOT NULL,
  evidence_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  resolution_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  receiver_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE security_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE banned_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  warning_count INTEGER NOT NULL DEFAULT 0,
  is_banned INTEGER NOT NULL DEFAULT 0,
  banned_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Migrating Existing MySQL Data

If you have existing data in MySQL to migrate:

1. Export from MySQL:
   ```bash
   mysqldump --compatible=ansi community_hub users tools transactions > dump.sql
   ```

2. Convert with a tool like [pgloader](https://pgloader.io) or write a Node migration script:
   ```typescript
   // scripts/migrate.ts
   import mysql from 'mysql2/promise';
   import { db } from '../src/lib/db';

   // Connect to old MySQL, fetch rows, INSERT into Turso
   ```

---

## 7. Environment Configuration

### Complete `.env.local` Reference

| Variable | Required | Description |
|---|---|---|
| `TURSO_DATABASE_URL` | ✅ | Your Turso database URL |
| `TURSO_AUTH_TOKEN` | ✅ | Turso auth token |
| `JWT_SECRET` | ✅ | 64+ char random string for JWT signing |
| `NEXT_PUBLIC_APP_URL` | ✅ | Full app URL (no trailing slash) |
| `EMAIL_HOST` | ✅ | SMTP host (smtp.gmail.com) |
| `EMAIL_PORT` | ✅ | SMTP port (465 for SSL) |
| `EMAIL_SECURE` | ✅ | `true` for port 465 |
| `EMAIL_USER` | ✅ | Gmail address |
| `EMAIL_PASS` | ✅ | Gmail App Password (16 chars) |
| `EMAIL_FROM` | ✅ | Display name + email |
| `MAX_UPLOAD_SIZE` | ⬜ | Max bytes per upload (default: 5242880) |

---

## 8. Feature Flowcharts

### 8.1 User Registration Flow

```
START
  │
  ▼
User fills registration form
(username, email, password, personal info, gov ID, profile pic)
  │
  ▼
POST /api/auth/register
  │
  ├── Validate required fields ──── FAIL ──→ Return 400 error
  │
  ├── Hash password with bcrypt (cost 12)
  │
  ├── Save gov ID photo → /public/uploads/ids/
  ├── Save profile pic  → /public/uploads/profiles/
  │
  ├── INSERT into users table (is_verified = 0)
  │
  ├── INSERT system notification for admin
  │
  └── Return success → User sees "Await verification" message

ADMIN STEP:
  │
  ▼
Admin visits /admin/dashboard or /admin/users
  │
  ▼
Admin sees pending verification list
  │
  ▼
Admin clicks "View ID" → reviews gov ID photo
  │
  ▼
Admin clicks "Verify" → PATCH /api/users/[id] { action: "verify" }
  │
  ▼
is_verified = 1 → User can now log in and access the platform
```

---

### 8.2 Login Flow

```
START
  │
  ▼
User submits login form
  │
  ▼
POST /api/auth/login
  │
  ├── Check admins table first
  │     │
  │     ├── Found + password match ──→ Sign JWT (role: admin)
  │     │                               Set HttpOnly cookie
  │     │                               Redirect → /admin/dashboard
  │     │
  │     └── Not found → check users table
  │
  ├── Check users table
  │     │
  │     ├── Not found → Return 401 "Invalid credentials"
  │     │
  │     ├── Password wrong → Return 401
  │     │
  │     ├── is_verified = 0 → Return 403 "Pending verification"
  │     │
  │     ├── account_status = 'suspended' → Return 403 "Suspended"
  │     │
  │     └── All checks pass:
  │             Send login alert email (async, non-blocking)
  │             Sign JWT (role: user)
  │             Set HttpOnly cookie (7-day expiry)
  │             Return success → Client redirects to /
  │
  ▼
Middleware intercepts every request
  │
  ├── Read lsh_token cookie
  ├── Verify JWT signature
  ├── Extract payload (id, username, role)
  └── Route accordingly
```

---

### 8.3 Tool Borrowing Flow

```
START (User browses /dashboard)
  │
  ▼
User sees ToolCard for an available tool
  │
  ▼
User clicks "Borrow" → BorrowModal opens
  │
  ├── Select payment method: [Free / Deposit] or [GCash]
  │
  ├── If GCash selected:
  │     Enter GCash Reference ID
  │     Upload payment screenshot
  │
  ▼
POST /api/transactions (FormData)
  │
  ├── Check tool is still 'available' ──── NOT AVAILABLE ──→ Error 409
  │
  ├── If GCash: Save screenshot to /public/uploads/payments/
  │
  ├── INSERT transaction (approval_status: 'pending')
  │
  └── INSERT notification for tool owner
          "New Request: @borrower wants to borrow your 'Tool Name'"

TOOL OWNER STEP:
  │
  ▼
Owner sees badge on "Lender Tasks" in sidebar
  │
  ▼
Owner visits /my-requests
  │
  ▼
Owner sees RequestCard with borrower info
  │
  ├── If GCash payment:
  │     Owner sees borrower's Reference ID
  │     Owner enters matching Reference ID to confirm
  │     ⚠  IDs must MATCH — prevents scam approvals
  │
  ├── Click "APPROVE" → PATCH /api/transactions/[id] { action: 'approve' }
  │       │
  │       ├── Cross-check GCash ref IDs (if applicable)
  │       ├── UPDATE transaction approval_status = 'approved'
  │       ├── UPDATE tool status = 'borrowed'
  │       ├── Send approval email to borrower
  │       └── INSERT success notification for borrower
  │
  └── Click "DECLINE" → PATCH /api/transactions/[id] { action: 'declined' }
          │
          ├── UPDATE transaction approval_status = 'declined'
          ├── Send decline email to borrower
          └── INSERT danger notification for borrower
```

---

### 8.4 Admin Tool Approval Flow

```
User submits tool via POST /api/tools
  │
  tool.approval_status = 'pending'
  │
  ▼
Admin visits /admin/tools
  │
  ▼
Admin sees pending tools list
  │
  ├── Click "Approve" → PATCH /api/tools/[id] { approval_status: 'approved' }
  │       Tool becomes visible on /dashboard
  │
  └── Click "Decline" → PATCH /api/tools/[id] { approval_status: 'declined' }
          Tool is hidden from listings
```

---

### 8.5 Report Submission Flow

```
User encounters an issue
  │
  ▼
User visits /report (POST /api/reports)
  │
  ├── Select issue type (e.g. "Scam", "Damaged Tool", "No Show")
  ├── Write details
  └── Upload evidence photo (optional)
  │
  ▼
INSERT reports table (status: 'pending')
  │
  ▼
Admin visits /admin/reports
  │
  ├── Reviews report + evidence
  │
  ├── Click "Resolve" → status = 'resolved'
  └── Click "Dismiss" → status = 'dismissed'
```

---

## 9. API Reference

### Authentication

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/login` | `{ username, password }` | Login; sets JWT cookie |
| POST | `/api/auth/register` | FormData (multipart) | Register new user |
| POST | `/api/auth/logout` | — | Clears JWT cookie |

### Tools

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/tools` | User/Admin | List approved tools |
| GET | `/api/tools?all=true` | Admin | List all tools |
| POST | `/api/tools` | User | Submit new tool |
| PATCH | `/api/tools/[id]` | Admin | Approve / decline / hide |
| DELETE | `/api/tools/[id]` | Owner/Admin | Soft-delete (hide) |

### Transactions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/transactions?mode=lender` | User | Get pending requests for my tools |
| GET | `/api/transactions?mode=borrower` | User | Get my borrow requests |
| GET | `/api/transactions?mode=all` | Admin | All transactions |
| POST | `/api/transactions` | User | Create borrow request |
| PATCH | `/api/transactions/[id]` | Owner/Admin | Approve or decline |

### Users (Admin)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users` | Admin | List all users |
| PATCH | `/api/users/[id]` | Admin | verify / suspend / activate / warn / ban |

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | User/Admin | Get notifications |
| PATCH | `/api/notifications` | User/Admin | Mark read |

### Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/reports` | Admin | List all reports |
| POST | `/api/reports` | User | Submit a report |

### Messages

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/messages` | User | Get chat partners |
| GET | `/api/messages?with=[userId]` | User | Get messages with user |
| POST | `/api/messages` | User | Send message |

### Response Format

All API routes return JSON:
```json
// Success
{ "status": "success", "message": "...", "data": { ... } }

// Error
{ "status": "error", "message": "Human-readable error description." }
```

---

## 10. Deployment Guide (Vercel)

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: LSH v2.0"
git remote add origin https://github.com/yourusername/lubao-share-hub.git
git push -u origin main
```

### Step 2 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Click "Deploy" — first deploy will run

### Step 3 — Add Environment Variables

In Vercel → Project → Settings → Environment Variables, add:

```
TURSO_DATABASE_URL     = libsql://...
TURSO_AUTH_TOKEN       = ...
JWT_SECRET             = ...
NEXT_PUBLIC_APP_URL    = https://your-vercel-domain.vercel.app
EMAIL_HOST             = smtp.gmail.com
EMAIL_PORT             = 465
EMAIL_SECURE           = true
EMAIL_USER             = lubaocommunitysharehub@gmail.com
EMAIL_PASS             = your-app-password
EMAIL_FROM             = "Lubao Share Hub <lubaocommunitysharehub@gmail.com>"
```

### Step 4 — Handle File Uploads on Vercel

> ⚠️ **Important:** Vercel's serverless functions have an **ephemeral filesystem** — files written to `/public/uploads/` will be deleted on each deploy or function restart.

**Solution options:**

**Option A (Recommended for Production): Cloudinary**
```bash
npm install cloudinary
```
Replace the file-write code in API routes with:
```typescript
import { v2 as cloudinary } from 'cloudinary';
const result = await cloudinary.uploader.upload(filePath);
const url = result.secure_url;
```

**Option B: Vercel Blob**
```bash
npm install @vercel/blob
```
```typescript
import { put } from '@vercel/blob';
const blob = await put('filename.jpg', fileBuffer, { access: 'public' });
const url = blob.url;
```

**Option C (Development/Small Scale): External server or VPS for file storage**

### Step 5 — Verify Deployment

Visit your Vercel URL → login → test all features.

---

## 11. Developer Notes

### Adding New Pages (App Router Pattern)

```typescript
// src/app/(user)/new-page/page.tsx
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Fetch data from Turso
  // Return JSX
}
```

### Adding New API Routes

```typescript
// src/app/api/your-feature/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: "error" }, { status: 401 });

  const result = await db.execute({ sql: "SELECT ...", args: [] });
  return NextResponse.json({ status: "success", data: result.rows });
}
```

### Turso Query Pattern

```typescript
// Always use parameterized queries — never string interpolation
await db.execute({
  sql: "INSERT INTO tools (name, owner_id) VALUES (?, ?)",
  args: [name, ownerId]  // args array maps to ? placeholders in order
});

// For reads
const { rows } = await db.execute({ sql: "SELECT * FROM tools WHERE id = ?", args: [id] });
const tool = rows[0]; // rows[0] is the first result row
```

### Mobile-First & No-Zoom Design

The root `layout.tsx` sets:
```tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```
This prevents pinch-to-zoom on mobile, matching the original system's fixed-screen requirement.

---

## 12. Troubleshooting

### ❌ "Missing env variable: TURSO_DATABASE_URL"
→ Make sure `.env.local` exists and is not empty. Restart `npm run dev` after editing.

### ❌ "UNIQUE constraint failed: users.username"
→ The username or email already exists in the database. Use a different one.

### ❌ JWT token not being set
→ Check that `JWT_SECRET` is set in `.env.local`. Ensure the cookie `lsh_token` is being sent on subsequent requests (check browser DevTools → Application → Cookies).

### ❌ Email not sending
→ Verify your Gmail App Password. Make sure 2FA is enabled on the Gmail account. Check `EMAIL_PASS` is the 16-char app password, NOT your main Gmail password.

### ❌ File uploads not working on Vercel
→ Vercel does not persist local file writes. Migrate to Cloudinary or Vercel Blob as described in Section 10.

### ❌ "Cannot read properties of undefined (reading 'rows')"
→ Your Turso query returned no rows. The table might be empty or the query has incorrect args. Add `console.log` to debug.

### ❌ Sidebar not showing on mobile
→ Ensure the hamburger menu button (top-left) is tapped. The sidebar opens as a slide-in drawer on mobile.

---

*Guide prepared for Lubao Community Share Hub v2.0 · May 2026*
*For support, contact the development team.*
