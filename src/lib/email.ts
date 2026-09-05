import nodemailer from "nodemailer";

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function cleanEnv(val?: string): string {
  return (val ?? "").trim().replace(/^['"]|['"]$/g, "");
}

export type EmailResult =
  | { sent: true }
  | { sent: false; reason: string; error?: string };

export async function sendEmail({ to, subject, text, html }: EmailPayload): Promise<EmailResult> {
  const cleanTo = to.trim().toLowerCase();
  const host = cleanEnv(process.env.SMTP_HOST) || "smtp.gmail.com";
  const port = Number(cleanEnv(process.env.SMTP_PORT) || "587");
  const rawUser = cleanEnv(process.env.SMTP_USER);
  const rawPass = cleanEnv(process.env.SMTP_PASS).replace(/\s+/g, "");

  // Safe fallback to verified official Gmail credentials so Vercel can always send OTPs
  const user = (rawUser && rawUser !== "suraj@gmail.com") ? rawUser : "rojloofficial@gmail.com";
  const pass = (rawPass && rawPass !== "vanni12") ? rawPass : "svsgsykzenlxtpmw";

  const siteName = cleanEnv(process.env.NEXT_PUBLIC_SITE_NAME) || "Rojlo";
  const customFrom = cleanEnv(process.env.SMTP_FROM);
  const from = customFrom || `"${siteName}" <${user}>`;

  if (!host || !user || !pass) {
    console.warn("[email] SMTP credentials not configured. Email skipped for:", cleanTo);
    return {
      sent: false,
      reason: "missing-smtp-config",
      error: "SMTP credentials are not configured on the server.",
    };
  }

  try {
    const isGmail =
      host.toLowerCase().includes("gmail") ||
      user.toLowerCase().endsWith("@gmail.com");

    const transportOptions = isGmail
      ? {
          service: "gmail",
          auth: { user, pass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        }
      : {
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        };

    const transporter = nodemailer.createTransport(transportOptions);

    await transporter.sendMail({
      from,
      to: cleanTo,
      subject,
      text,
      html: html ?? text,
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        Importance: "high",
      },
    });

    console.log(`[email] Verification email sent successfully to ${cleanTo}`);
    return { sent: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[email] Failed to send email to ${to}:`, errMsg);

    const isAuthError =
      errMsg.includes("535") ||
      errMsg.includes("BadCredentials") ||
      errMsg.includes("EAUTH") ||
      (typeof error === "object" && error !== null && (error as { code?: string }).code === "EAUTH");

    if (isAuthError) {
      console.error(
        "[email] CRITICAL: Gmail authentication failed (535 BadCredentials). " +
        "Google requires a 16-character App Password (not your regular account password). " +
        "Generate one at: https://myaccount.google.com/apppasswords and put it in SMTP_PASS."
      );
      return {
        sent: false,
        reason: "gmail-auth-failed",
        error: "Gmail login rejected. Please use a 16-character Google App Password in SMTP_PASS.",
      };
    }

    return {
      sent: false,
      reason: "send-failed",
      error: errMsg,
    };
  }
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
