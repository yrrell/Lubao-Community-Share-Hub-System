// ============================================================
// src/lib/email.ts  –  Nodemailer email helpers
// ============================================================
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST ?? "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT ?? 465),
  secure: process.env.EMAIL_SECURE === "true",
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
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return true;
  } catch (err) {
    console.error("[Email Error]", err);
    return false;
  }
}

// ---- Email Templates ----

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
