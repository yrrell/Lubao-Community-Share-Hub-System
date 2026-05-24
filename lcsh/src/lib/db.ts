// ============================================================
// src/lib/db.ts  –  Turso (libSQL) database client
// ============================================================
import { createClient } from "@libsql/client/http";

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("Missing env variable: TURSO_DATABASE_URL");
}
if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error("Missing env variable: TURSO_AUTH_TOKEN");
}

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ============================================================
// SQL Schema – run once to initialise the database
// Execute with: npx ts-node -e "require('./src/lib/db').initSchema()"
// OR paste the SQL into Turso's shell: turso db shell <db-name>
// ============================================================
export async function initSchema() {
  const statements = [
    // --- Users ---
    `CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      first_name    TEXT    NOT NULL,
      middle_name   TEXT,
      last_name     TEXT    NOT NULL,
      birthday      TEXT    NOT NULL,
      phone_number  TEXT,
      full_address  TEXT,
      gov_id_path   TEXT,
      profile_pic   TEXT    DEFAULT 'uploads/defaults/default-user.png',
      role          TEXT    NOT NULL DEFAULT 'user',
      account_status TEXT   NOT NULL DEFAULT 'active',
      is_verified   INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- Admins ---
    `CREATE TABLE IF NOT EXISTS admins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      profile_pic   TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- Tools ---
    `CREATE TABLE IF NOT EXISTS tools (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      description     TEXT,
      image_url       TEXT,
      owner_id        INTEGER NOT NULL REFERENCES users(id),
      status          TEXT    NOT NULL DEFAULT 'available',
      approval_status TEXT    NOT NULL DEFAULT 'pending',
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- Transactions ---
    `CREATE TABLE IF NOT EXISTS transactions (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_id            INTEGER NOT NULL REFERENCES tools(id),
      borrower_id        INTEGER NOT NULL REFERENCES users(id),
      status             TEXT    NOT NULL DEFAULT 'pending',
      approval_status    TEXT    NOT NULL DEFAULT 'pending',
      payment_method     TEXT    NOT NULL DEFAULT 'free',
      payment_ref        TEXT,
      payment_screenshot TEXT,
      created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- Notifications ---
    `CREATE TABLE IF NOT EXISTS notifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER REFERENCES users(id),
      message    TEXT    NOT NULL,
      type       TEXT    NOT NULL DEFAULT 'info',
      related_id INTEGER,
      is_read    INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- Reports ---
    `CREATE TABLE IF NOT EXISTS reports (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id),
      issue_type      TEXT    NOT NULL,
      details         TEXT    NOT NULL,
      evidence_path   TEXT,
      status          TEXT    NOT NULL DEFAULT 'pending',
      resolution_note TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- Messages ---
    `CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id   INTEGER NOT NULL REFERENCES users(id),
      receiver_id INTEGER NOT NULL REFERENCES users(id),
      content     TEXT    NOT NULL,
      is_read     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- Security Logs ---
    `CREATE TABLE IF NOT EXISTS security_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER REFERENCES users(id),
      action     TEXT    NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,

    // --- Banned Users ---
    `CREATE TABLE IF NOT EXISTS banned_users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE,
      user_id       INTEGER REFERENCES users(id),
      warning_count INTEGER NOT NULL DEFAULT 0,
      is_banned     INTEGER NOT NULL DEFAULT 0,
      banned_at     TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,
  ];

  for (const sql of statements) {
    await db.execute(sql);
  }

  console.log("✅ LSH database schema initialised successfully.");
}
