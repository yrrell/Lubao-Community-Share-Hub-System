-- ============================================================
-- migrate_lcsh_v2.sql
-- Turso / libSQL migration for LCSH v2
-- Run once against your Turso database.
--
-- What this migration adds:
--   borrows: +payment_method, +payment_ref, +payment_screenshot
--            (the borrow flow needs to record how payment was made)
--
-- All other tables already match the application code after the
-- code-side fixes in this update.
-- ============================================================

-- ── borrows: add payment tracking columns ────────────────────

ALTER TABLE borrows ADD COLUMN payment_method TEXT DEFAULT 'free';
ALTER TABLE borrows ADD COLUMN payment_ref TEXT;
ALTER TABLE borrows ADD COLUMN payment_screenshot TEXT;

-- ── Verify borrows schema after migration ────────────────────
-- Run this SELECT in Turso shell to confirm:
--
-- .schema borrows
--
-- Expected new columns at the end:
--   payment_method TEXT DEFAULT 'free'
--   payment_ref TEXT
--   payment_screenshot TEXT

-- ── Optional: backfill existing rows ─────────────────────────
-- Existing borrows already default to payment_method='free',
-- payment_ref=NULL, payment_screenshot=NULL. No backfill needed.

-- ── Full expected final schema (for reference) ───────────────
--
-- CREATE TABLE `borrows` (
--   `id`                 integer PRIMARY KEY AUTOINCREMENT,
--   `item_id`            integer NOT NULL,
--   `borrower_id`        integer NOT NULL,
--   `owner_id`           integer NOT NULL,
--   `borrow_date`        text NOT NULL,
--   `due_date`           text NOT NULL,
--   `return_date`        text,
--   `status`             text DEFAULT 'pending' NOT NULL,
--   `total_fee`          real DEFAULT 0,
--   `payment_status`     text DEFAULT 'unpaid',
--   `payment_method`     text DEFAULT 'free',        -- NEW
--   `payment_ref`        text,                        -- NEW
--   `payment_screenshot` text,                        -- NEW
--   `borrower_note`      text,
--   `owner_note`         text,
--   `created_at`         numeric DEFAULT CURRENT_TIMESTAMP,
--   `updated_at`         numeric DEFAULT CURRENT_TIMESTAMP,
--   CONSTRAINT `fk_borrows_owner_id_users_id_fk`
--     FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`),
--   CONSTRAINT `fk_borrows_borrower_id_users_id_fk`
--     FOREIGN KEY (`borrower_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
--   CONSTRAINT `fk_borrows_item_id_items_id_fk`
--     FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE CASCADE,
--   CONSTRAINT "borrows_check_5"
--     CHECK(status IN ('pending','approved','active','returned','cancelled','overdue')),
--   CONSTRAINT "borrows_check_6"
--     CHECK(payment_status IN ('unpaid','paid','waived'))
-- );
