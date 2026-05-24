// src/lib/db.ts  (UPDATED — replaces existing)
// ============================================================
// Turso (libSQL) database client + full schema init
// ============================================================
import { createClient } from "@libsql/client";

if (!process.env.TURSO_DATABASE_URL) throw new Error("Missing env: TURSO_DATABASE_URL");
if (!process.env.TURSO_AUTH_TOKEN)   throw new Error("Missing env: TURSO_AUTH_TOKEN");

export const db = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initSchema() {
  const stmts = [
    // Users
    `CREATE TABLE IF NOT EXISTS users (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      username       TEXT    NOT NULL UNIQUE,
      email          TEXT    NOT NULL UNIQUE,
      password_hash  TEXT    NOT NULL,
      first_name     TEXT    NOT NULL,
      middle_name    TEXT,
      last_name      TEXT    NOT NULL,
      birthday       TEXT    NOT NULL,
      phone_number   TEXT,
      full_address   TEXT,
      gov_id_path    TEXT,
      profile_pic    TEXT    DEFAULT 'uploads/defaults/default-user.png',
      role           TEXT    NOT NULL DEFAULT 'user'
                             CHECK(role IN ('user','admin','moderator')),
      account_status TEXT    NOT NULL DEFAULT 'pending'
                             CHECK(account_status IN ('active','suspended','banned','pending')),
      is_verified    INTEGER NOT NULL DEFAULT 0,
      warning_count  INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // Admins (separate table for isolation)
    `CREATE TABLE IF NOT EXISTS admins (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      username       TEXT    NOT NULL UNIQUE,
      email          TEXT    NOT NULL UNIQUE,
      password_hash  TEXT    NOT NULL,
      profile_pic    TEXT,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      is_locked      INTEGER NOT NULL DEFAULT 0,
      locked_until   TEXT,
      account_status TEXT    NOT NULL DEFAULT 'active',
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // Tools
    `CREATE TABLE IF NOT EXISTS tools (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      description     TEXT,
      image_url       TEXT,
      owner_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status          TEXT    NOT NULL DEFAULT 'available'
                              CHECK(status IN ('available','borrowed','hidden','pending')),
      approval_status TEXT    NOT NULL DEFAULT 'pending'
                              CHECK(approval_status IN ('pending','approved','declined')),
      payment_method  TEXT    NOT NULL DEFAULT 'free'
                              CHECK(payment_method IN ('free','cash','gcash')),
      fee             REAL    NOT NULL DEFAULT 0,
      condition_note  TEXT    DEFAULT 'good',
      known_issues    TEXT,
      service_type    TEXT    DEFAULT 'pickup',
      landmark        TEXT,
      borrow_count    INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // Transactions (borrows)
    `CREATE TABLE IF NOT EXISTS transactions (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_id            INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
      borrower_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status             TEXT    NOT NULL DEFAULT 'pending'
                                 CHECK(status IN ('pending','active','returned','cancelled')),
      approval_status    TEXT    NOT NULL DEFAULT 'pending'
                                 CHECK(approval_status IN ('pending','approved','declined')),
      payment_method     TEXT    NOT NULL DEFAULT 'free',
      payment_ref        TEXT,
      payment_screenshot TEXT,
      created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // Notifications
    `CREATE TABLE IF NOT EXISTS notifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      message    TEXT    NOT NULL,
      type       TEXT    NOT NULL DEFAULT 'info',
      related_id INTEGER,
      is_read    INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // Reports
    `CREATE TABLE IF NOT EXISTS reports (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      issue_type      TEXT    NOT NULL,
      details         TEXT    NOT NULL,
      evidence_path   TEXT,
      status          TEXT    NOT NULL DEFAULT 'pending'
                              CHECK(status IN ('pending','resolved','dismissed')),
      resolution_note TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // Messages
    `CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body        TEXT    NOT NULL,
      is_read     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // Security Logs
    `CREATE TABLE IF NOT EXISTS security_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action     TEXT    NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_tools_owner      ON tools(owner_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tools_status     ON tools(status, approval_status)`,
    `CREATE INDEX IF NOT EXISTS idx_tx_borrower      ON transactions(borrower_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tx_tool          ON transactions(tool_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifs_user      ON notifications(user_id, is_read)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_recv    ON messages(receiver_id, is_read)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_sender  ON messages(sender_id)`,
    `CREATE INDEX IF NOT EXISTS idx_reports_status   ON reports(status)`,
    `CREATE INDEX IF NOT EXISTS idx_sec_logs_created ON security_logs(created_at)`,
  ];

  for (const sql of stmts) {
    await db.execute(sql);
  }
  console.log("✅ LSH v3.0 database schema initialised.");
}
