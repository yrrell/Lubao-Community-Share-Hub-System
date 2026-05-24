#!/usr/bin/env node
// migrate.js — Run once to initialise or update the LSH v3 database
// Usage: node migrate.js
// Or: npm run db:migrate

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@libsql/client");
const bcrypt = require("bcryptjs");

async function main() {
  console.log("🔄 Connecting to Turso database...");
  const db = createClient({
    url:       process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("🔄 Running migrations...");

  const migrations = [
    // Users
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, first_name TEXT NOT NULL,
      middle_name TEXT, last_name TEXT NOT NULL, birthday TEXT NOT NULL,
      phone_number TEXT, full_address TEXT, gov_id_path TEXT,
      profile_pic TEXT DEFAULT 'uploads/defaults/default-user.png',
      role TEXT NOT NULL DEFAULT 'user', account_status TEXT NOT NULL DEFAULT 'pending',
      is_verified INTEGER NOT NULL DEFAULT 0, warning_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    // Admins
    `CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, profile_pic TEXT,
      failed_attempts INTEGER NOT NULL DEFAULT 0, is_locked INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT, account_status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    // Tools — add new columns if missing
    `CREATE TABLE IF NOT EXISTS tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT,
      image_url TEXT, owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'available', approval_status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT NOT NULL DEFAULT 'free', fee REAL NOT NULL DEFAULT 0,
      condition_note TEXT DEFAULT 'good', known_issues TEXT,
      service_type TEXT DEFAULT 'pickup', landmark TEXT, borrow_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    // Transactions
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_id INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
      borrower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending', approval_status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT NOT NULL DEFAULT 'free', payment_ref TEXT, payment_screenshot TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    // Notifications
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'info',
      related_id INTEGER, is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    // Reports
    `CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      issue_type TEXT NOT NULL, details TEXT NOT NULL, evidence_path TEXT,
      status TEXT NOT NULL DEFAULT 'pending', resolution_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    // Messages
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    // Security Logs
    `CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL, ip_address TEXT, user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_tools_owner     ON tools(owner_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tools_status    ON tools(status, approval_status)`,
    `CREATE INDEX IF NOT EXISTS idx_tx_borrower     ON transactions(borrower_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tx_tool         ON transactions(tool_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifs_user     ON notifications(user_id, is_read)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_recv   ON messages(receiver_id, is_read)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`,
    `CREATE INDEX IF NOT EXISTS idx_reports_status  ON reports(status)`,
  ];

  for (const sql of migrations) {
    await db.execute(sql);
    process.stdout.write(".");
  }

  console.log("\n✅ Tables and indexes created.");

  // Seed default admin if none exists
  const admins = await db.execute("SELECT COUNT(*) AS cnt FROM admins");
  if (Number(admins.rows[0].cnt) === 0) {
    const hash = await bcrypt.hash("admin@LSH2025", 12);
    await db.execute({
      sql: "INSERT INTO admins (username, email, password_hash) VALUES (?,?,?)",
      args: ["lerry", "admin@lubao-sharehub.com", hash],
    });
    console.log("👤 Default admin created:");
    console.log("   Username: lerry");
    console.log("   Password: admin@LSH2025");
    console.log("   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY after first login!");
  } else {
    console.log("ℹ️  Admin accounts already exist — skipping seed.");
  }

  console.log("\n🎉 Migration complete. Your LSH v3 database is ready.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
