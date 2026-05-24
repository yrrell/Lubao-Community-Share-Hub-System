// ============================================================
// src/types/index.ts
// Global TypeScript types – aligned to actual Turso/SQLite schema
// Tables: users, admin_accounts, items, item_categories,
//         borrows, reviews, notifications, messages, reports, security_logs
// ============================================================

// ── Enums (matching schema CHECK constraints) ─────────────────────────────────

export type UserRole       = "user" | "admin" | "moderator";
export type AccountStatus  = "active" | "suspended" | "banned" | "pending";
export type ItemCondition  = "new" | "like_new" | "good" | "fair" | "poor";
export type BorrowType     = "free" | "fee_based" | "donation";
export type BorrowStatus   = "pending" | "approved" | "active" | "returned" | "cancelled" | "overdue";
export type PaymentStatus  = "unpaid" | "paid" | "waived";
export type PaymentMethod  = "free" | "gcash" | "bank_transfer" | "donation";
export type ReportStatus   = "pending" | "under_review" | "resolved" | "dismissed";
export type NotifType      =
  | "borrow_request"
  | "approval"
  | "cancellation"
  | "return"
  | "report"
  | "system"
  | "info"
  | "success"
  | "danger"
  | "warning";

// ── Database Row Types ────────────────────────────────────────────────────────

export interface User {
  id:             number;
  username:       string;
  email:          string;
  first_name:     string;
  middle_name:    string | null;
  last_name:      string;
  birthday:       string | null;
  phone_number:   string | null;
  full_address:   string | null;
  gov_id_path:    string | null;
  profile_pic:    string | null;
  role:           UserRole;
  account_status: AccountStatus;
  is_verified:    number;           // SQLite integer: 0 | 1
  warning_count:  number;
  created_at:     string;
  updated_at:     string;
}

/** Matches admin_accounts table */
export interface Admin {
  id:             number;
  username:       string;
  email:          string;
  password_hash:  string;
  profile_pic:    string | null;
  failed_attempts: number;
  is_locked:      number;           // SQLite integer: 0 | 1
  locked_until:   string | null;
  account_status: string;
  created_at:     string;
}

/** Matches item_categories table */
export interface ItemCategory {
  id:          number;
  name:        string;
  description: string | null;
  icon:        string | null;
  created_at:  string;
}

/** Matches items table */
export interface Item {
  id:              number;
  owner_id:        number;
  category_id:     number | null;
  title:           string;
  description:     string | null;
  condition:       ItemCondition;
  borrow_type:     BorrowType;
  fee_per_day:     number;
  max_borrow_days: number;
  location:        string | null;
  image_path:      string | null;
  is_available:    number;          // SQLite integer: 0 | 1
  is_active:       number;          // SQLite integer: 0 | 1
  borrow_count:    number;
  created_at:      string;
  updated_at:      string;
  // Joined fields
  owner_username?: string;
  owner_name?:     string;
  owner_pic?:      string;
  category_name?:  string;
}

/** Matches borrows table + added payment columns via migration */
export interface Borrow {
  id:                 number;
  item_id:            number;
  borrower_id:        number;
  owner_id:           number;
  borrow_date:        string;
  due_date:           string;
  return_date:        string | null;
  status:             BorrowStatus;
  total_fee:          number;
  payment_status:     PaymentStatus;
  payment_method:     PaymentMethod | null;   // added via migration
  payment_ref:        string | null;           // added via migration
  payment_screenshot: string | null;           // added via migration
  borrower_note:      string | null;
  owner_note:         string | null;
  created_at:         string;
  updated_at:         string;
  // Joined fields
  item_title?:         string;
  item_image?:         string;
  borrower_username?:  string;
  borrower_name?:      string;
  borrower_email?:     string;
  owner_username?:     string;
  owner_name?:         string;
}

/** Matches reviews table */
export interface Review {
  id:          number;
  borrow_id:   number;
  reviewer_id: number;
  reviewee_id: number | null;
  item_id:     number | null;
  rating:      number;           // 1–5
  comment:     string | null;
  created_at:  string;
}

/** Matches notifications table */
export interface Notification {
  id:         number;
  user_id:    number;
  type:       NotifType;
  title:      string;
  body:       string | null;
  is_read:    number;            // SQLite integer: 0 | 1
  link:       string | null;
  created_at: string;
}

/** Matches messages table */
export interface Message {
  id:          number;
  sender_id:   number;
  receiver_id: number;
  borrow_id:   number | null;
  body:        string;
  is_read:     number;           // SQLite integer: 0 | 1
  created_at:  string;
  // Joined fields
  sender_username?: string;
  sender_pic?:      string;
}

/** Matches reports table */
export interface Report {
  id:              number;
  user_id:         number;
  issue_type:      string;
  details:         string;
  evidence_path:   string | null;
  status:          ReportStatus;
  resolution_note: string | null;
  created_at:      string;
  // Joined fields
  reporter_name?:     string;
  reporter_username?: string;
}

/** Matches security_logs table */
export interface SecurityLog {
  id:         number;
  user_id:    number | null;
  action:     string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ── API Response Types ────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  status:   "success" | "error";
  message?: string;
  data?:    T;
}

// ── Auth Types ────────────────────────────────────────────────────────────────

export interface JwtPayload {
  id:       number;
  username: string;
  role:     UserRole;
  iat?:     number;
  exp?:     number;
}

export interface SessionUser {
  id:       number;
  username: string;
  role:     UserRole;
}

// ── Legacy aliases (backwards-compat for any pages still using old names) ─────

/** @deprecated Use Item instead */
export type Tool = Item;
/** @deprecated Use Borrow instead */
export type Transaction = Borrow;
