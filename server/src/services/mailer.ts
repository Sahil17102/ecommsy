import nodemailer from "nodemailer";
import logger from "../config/logger.js";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const TAG = "[Mailer]";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Low-level email send. Prefers SMTP when configured, then falls back to Brevo.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM ?? "noreply@boxandbeyond.in";
  const fromName = process.env.EMAIL_FROM_NAME ?? "Box and Beyond";
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"${fromName}" <${from}>`,
        to: params.to,
        subject: params.subject,
        text: params.text ?? stripHtml(params.html),
        html: params.html,
      });

      logger.info(`${TAG} Sent via SMTP to ${params.to}: ${params.subject}`);
      return true;
    } catch (err) {
      logger.error(`${TAG} SMTP send failed to ${params.to}: ${(err as Error).message}`);
      if (!apiKey) return false;
    }
  }

  if (!apiKey) {
    logger.warn(`${TAG} SMTP/BREVO not configured - skipping email to ${params.to}`);
    return false;
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: fromName, email: from },
        to: [{ email: params.to }],
        subject: params.subject,
        textContent: params.text ?? stripHtml(params.html),
        htmlContent: params.html,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      logger.error(`${TAG} Failed to send to ${params.to}`, body);
      return false;
    }

    logger.info(`${TAG} Sent via Brevo to ${params.to}: ${params.subject}`);
    return true;
  } catch (err) {
    logger.error(`${TAG} Error sending to ${params.to}: ${(err as Error).message}`);
    return false;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/** Legacy helper used by existing auth flow, now routes through notify(). */
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const { notify } = await import("./notificationService.js");
  await notify({
    userId: null,
    overrideEmail: email,
    event: "auth.otp",
    data: { code },
  });
}
