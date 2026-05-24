// ============================================================
// Global TypeScript types for Lubao Community Share Hub
// ============================================================

export type UserRole = "user" | "admin" | "superadmin";
export type AccountStatus = "active" | "suspended" | "banned";
export type ToolStatus = "available" | "borrowed" | "pending_approval" | "hidden";
export type ApprovalStatus = "pending" | "approved" | "declined";
export type TransactionStatus = "pending" | "active" | "returned" | "cancelled";
export type PaymentMethod = "free" | "gcash";
export type NotificationType = "borrow_request" | "success" | "danger" | "info" | "system";
export type ReportStatus = "pending" | "resolved" | "dismissed";

// ---- Database Row Types ----

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  birthday: string;
  phone_number: string;
  full_address: string;
  gov_id_path: string | null;
  profile_pic: string;
  role: UserRole;
  account_status: AccountStatus;
  is_verified: 0 | 1;
  warning_count: number;
  created_at: string;
}

export interface Admin {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  profile_pic: string | null;
  created_at: string;
}

export interface Tool {
  id: number;
  name: string;
  description: string;
  image_url: string;
  owner_id: number;
  status: ToolStatus;
  approval_status: ApprovalStatus;
  created_at: string;
  // Joined fields
  owner_name?: string;
  owner_username?: string;
}

export interface Transaction {
  id: number;
  tool_id: number;
  borrower_id: number;
  status: TransactionStatus;
  approval_status: ApprovalStatus;
  payment_method: PaymentMethod;
  payment_ref: string | null;
  payment_screenshot: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  tool_name?: string;
  tool_image?: string;
  borrower_username?: string;
  borrower_name?: string;
  borrower_email?: string;
  owner_id?: number;
}

export interface Notification {
  id: number;
  user_id: number | null;
  message: string;
  type: NotificationType;
  related_id: number | null;
  is_read: 0 | 1;
  created_at: string;
}

export interface Report {
  id: number;
  user_id: number;
  issue_type: string;
  details: string;
  evidence_path: string | null;
  status: ReportStatus;
  resolution_note: string | null;
  created_at: string;
  // Joined
  reporter_name?: string;
  reporter_username?: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: 0 | 1;
  created_at: string;
  // Joined
  sender_username?: string;
  sender_pic?: string;
}

export interface SecurityLog {
  id: number;
  user_id: number | null;
  action: string;
  ip_address: string;
  user_agent: string | null;
  created_at: string;
}

// ---- API Response Types ----

export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  message?: string;
  data?: T;
}

// ---- Auth Types ----

export interface JwtPayload {
  id: number;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface SessionUser {
  id: number;
  username: string;
  role: UserRole;
}
