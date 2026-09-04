export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail({ to, subject, text, html }: EmailPayload) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user ?? "noreply@localhost";

  if (!host || !user || !pass) {
    console.log("[email] SMTP not configured. Email skipped.", {
      to,
      subject,
    });
    return { sent: false, reason: "missing-smtp-config" as const };
  }

  const nodemailer = await import("nodemailer");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: html ?? text,
  });

  return { sent: true };
}

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Rojlo";

/**
 * Send an email verification OTP to the user, using the site's branding.
 * Never logs the OTP itself.
 */
export function sendOtpEmail({
  to,
  otp,
  expiresInMinutes = 10,
}: {
  to: string;
  otp: string;
  expiresInMinutes?: number;
}) {
  const subject = `Your ${SITE_NAME} verification code`;
  const text = [
    `Your verification code is:`,
    ``,
    otp,
    ``,
    `This code expires in ${expiresInMinutes} minutes.`,
    ``,
    `If you did not request this code, you can safely ignore this email.`,
    ``,
    `— ${SITE_NAME}`,
  ].join("\n");

  const html = [
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #fecdd3;border-radius:20px;background:#fff1f2;">`,
    `<h2 style="color:#450a0a;margin:0 0 12px;">${SITE_NAME} — Verify your email</h2>`,
    `<p style="color:#7f1d1d;line-height:1.6;margin:0 0 16px;">Use the code below to verify your email address.</p>`,
    `<div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#450a0a;background:#ffe4e6;border-radius:12px;padding:16px;text-align:center;margin:0 0 16px;">${otp}</div>`,
    `<p style="color:#7f1d1d;font-size:14px;line-height:1.6;margin:0 0 8px;">This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>`,
    `<p style="color:#7f1d1d;font-size:14px;line-height:1.6;margin:0;">If you did not request this code, you can safely ignore this email.</p>`,
    `</div>`,
  ].join("");

  return sendEmail({ to, subject, text, html });
}
