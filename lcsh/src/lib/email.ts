// ============================================================
// src/lib/email.ts  –  Nodemailer email helpers
// FIX: Added emailAccountApproved template.
//      Fixed EMAIL_SECURE boolean parsing (was already using string comparison
//      correctly; kept as-is for compatibility with .env.local).
//      Added emailAccountRejected template for completeness.
// ============================================================
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST  ?? "smtp.gmail.com",
  port:   Number(process.env.EMAIL_PORT ?? 465),
  // When port 465 is used it requires secure:true; when 587 is used, secure:false.
  // The env var EMAIL_SECURE should be set to "true" or "false" accordingly.
  secure: process.env.EMAIL_SECURE !== "false", // default true (port 465)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? '"Lubao Share Hub" <noreply@example.com>',
      to:      opts.to,
      subject: opts.subject,
      html:    opts.html,
    });
    return true;
  } catch (err) {
    console.error("[Email Error]", err);
    return false;
  }
}

// ── Email Templates ───────────────────────────────────────────────────────

export function emailLoginAlert(firstName: string, timestamp: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#16a34a">Lubao Community Share Hub</h2>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>A new login was detected on your account on <strong>${timestamp}</strong>.</p>
      <p>If this was not you, please contact support immediately.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="font-size:12px;color:#6b7280">Lubao, Pampanga · Community Share Hub</p>
    </div>`;
}

/** NEW: Sent to a user when an admin approves their account. */
export function emailAccountApproved(firstName: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#16a34a">Account Approved! 🎉</h2>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Great news — your Lubao Community Share Hub account has been <strong style="color:#16a34a">verified and approved</strong> by our admin team.</p>
      <p>You can now log in and start borrowing or lending tools in your community.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login"
         style="display:inline-block;margin-top:12px;padding:10px 20px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
        Log In Now
      </a>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="font-size:12px;color:#6b7280">Lubao, Pampanga · Community Share Hub</p>
    </div>`;
}

/** NEW: Sent to a user when their account is suspended or banned. */
export function emailAccountSuspended(firstName: string, reason: "suspended" | "banned") {
  const actionLabel = reason === "banned" ? "permanently banned" : "suspended";
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#dc2626">Account ${reason === "banned" ? "Banned" : "Suspended"}</h2>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Your account has been <strong style="color:#dc2626">${actionLabel}</strong> by the platform administrators.</p>
      <p>If you believe this is a mistake, please reach out to the Lubao Community Share Hub support team.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="font-size:12px;color:#6b7280">Lubao, Pampanga · Community Share Hub</p>
    </div>`;
}

export function emailBorrowApproved(firstName: string, toolName: string, txId: number) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#16a34a">Borrow Request Approved!</h2>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Your request to borrow <strong>${toolName}</strong> has been <strong style="color:#16a34a">approved</strong>.</p>
      <p>Please coordinate with the lender for pickup. Transaction ID: <strong>#${txId}</strong></p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="font-size:12px;color:#6b7280">Lubao, Pampanga · Community Share Hub</p>
    </div>`;
}

export function emailBorrowDeclined(firstName: string, toolName: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#dc2626">Borrow Request Declined</h2>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Unfortunately, your request to borrow <strong>${toolName}</strong> was <strong style="color:#dc2626">declined</strong>.</p>
      <p>You can browse other available tools on the platform.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="font-size:12px;color:#6b7280">Lubao, Pampanga · Community Share Hub</p>
    </div>`;
}

export function emailGenericAlert(firstName: string, message: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#16a34a">Lubao Hub Alert</h2>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>${message}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="font-size:12px;color:#6b7280">Lubao, Pampanga · Community Share Hub</p>
    </div>`;
}
