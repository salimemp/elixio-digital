import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  attempts: number;
}

/**
 * Send an email via Resend with built-in retry + backoff.
 *
 * **Today:** in-process queue with 3 attempts (1s, 4s, 16s).
 * **Phase 2:** swap for BullMQ + Redis (Upstash free tier) when payouts
 * land and we need durable queue / DLQ. The `sendEmail` signature stays
 * the same so the call sites don't change.
 *
 * For user-initiated transactional emails (verify, password reset, magic
 * link), the caller awaits — the user is already blocked on the response
 * and the link is the deliverable.
 *
 * For fire-and-forget security alerts (new-location login notification),
 * pass `{ fireAndForget: true }` and the call returns immediately; failures
 * are logged but don't propagate. This is the recommended setting for
 * anything that shouldn't fail the parent request.
 */
export async function sendEmail(
  msg: EmailMessage,
  options: { fireAndForget?: boolean; maxAttempts?: number } = {}
): Promise<EmailSendResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const fireAndForget = options.fireAndForget ?? false;

  const work = async (): Promise<EmailSendResult> => {
    if (!resend) {
      // Dev fallback: log to stdout so developers can copy the link.
      console.log(`\n📧 [DEV EMAIL] to=${msg.to} subject=${msg.subject}`);
      console.log(msg.text);
      console.log("");
      return { ok: true, attempts: 0 };
    }

    let lastError: string | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await resend.emails.send({
          from: env.EMAIL_FROM,
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
        });
        if ("error" in result && result.error) {
          lastError = result.error.message;
          // 4xx (validation errors) won't succeed on retry — bail early.
          if (isClientError(result.error.message)) {
            return { ok: false, error: lastError, attempts: attempt };
          }
        } else {
          return { ok: true, messageId: "id" in result ? (result as { id?: string }).id : undefined, attempts: attempt };
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        // Network errors / 5xx → retry with backoff
      }

      if (attempt < maxAttempts) {
        const delayMs = 1000 * Math.pow(4, attempt - 1); // 1s, 4s, 16s
        await sleep(delayMs);
      }
    }

    return { ok: false, error: lastError, attempts: maxAttempts };
  };

  if (fireAndForget) {
    // Fire-and-forget: log failures but don't propagate.
    work()
      .then((r) => {
        if (!r.ok) {
          // eslint-disable-next-line no-console
          console.error(
            `[email] FAILED after ${r.attempts} attempts to=${msg.to} subject="${msg.subject}": ${r.error}`
          );
        } else if (env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log(
            `[email] sent to=${msg.to} attempts=${r.attempts} messageId=${r.messageId ?? "n/a"}`
          );
        }
      })
      .catch((err) => {
        // Should never happen — work() catches its own errors.
        // eslint-disable-next-line no-console
        console.error("[email] unexpected fire-and-forget error:", err);
      });
    // Return immediately with a placeholder result.
    return { ok: true, attempts: 0 };
  }

  return work();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isClientError(message: string): boolean {
  // Resend returns these for things like invalid recipient, blocked domain, etc.
  return /invalid|validation|422|400|401|403|not.?found/i.test(message);
}

export function verifyEmailTemplate(args: { verifyUrl: string }): EmailMessage {
  return {
    to: "",
    subject: "Verify your Elixio Digital email",
    text:
      `Welcome to Elixio Digital.\n\n` +
      `Confirm your email by opening this link (valid 24 hours):\n${args.verifyUrl}\n\n` +
      `If you didn't create an account, ignore this email.`,
    html: emailShell(
      "Verify your email",
      `<p>Welcome to Elixio Digital.</p>` +
        `<p>Confirm your email by clicking the button below. The link is valid for 24 hours.</p>` +
        `<p style="margin:32px 0"><a href="${args.verifyUrl}" style="background:#7B61FF;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Verify email</a></p>` +
        `<p style="color:#666;font-size:13px">If you didn't create an account, ignore this email.</p>`
    ),
  };
}

export function magicLinkTemplate(args: { url: string }): EmailMessage {
  return {
    to: "",
    subject: "Your Elixio Digital sign-in link",
    text: `Click this link to sign in (valid 15 minutes):\n${args.url}\n\nIf you didn't request this, ignore this email.`,
    html: emailShell(
      "Sign in to Elixio Digital",
      `<p>Click the button below to sign in. The link is valid for 15 minutes and can only be used once.</p>` +
        `<p style="margin:32px 0"><a href="${args.url}" style="background:#7B61FF;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Sign in</a></p>` +
        `<p style="color:#666;font-size:13px">If you didn't request this, ignore this email.</p>`
    ),
  };
}

export function passwordResetTemplate(args: { url: string }): EmailMessage {
  return {
    to: "",
    subject: "Reset your Elixio Digital password",
    text:
      `We received a request to reset your password.\n\n` +
      `Click this link to choose a new password (valid 1 hour):\n${args.url}\n\n` +
      `If you didn't request this, ignore this email and your password stays the same.`,
    html: emailShell(
      "Reset your password",
      `<p>We received a request to reset your password.</p>` +
        `<p>Click the button below to choose a new password. The link is valid for 1 hour.</p>` +
        `<p style="margin:32px 0"><a href="${args.url}" style="background:#7B61FF;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Reset password</a></p>` +
        `<p style="color:#666;font-size:13px">If you didn't request this, ignore this email and your password stays the same.</p>`
    ),
  };
}

export function newLocationTemplate(args: {
  displayName: string;
  ip: string;
  location: string;
  userAgent: string;
  time: Date;
}): EmailMessage {
  const time = args.time.toUTCString();
  const text =
    `Hi ${args.displayName},\n\n` +
    `We noticed a new sign-in to your Elixio Digital account.\n\n` +
    `When: ${time}\n` +
    `Where: ${args.location}\n` +
    `IP: ${args.ip}\n` +
    `Device: ${args.userAgent}\n\n` +
    `If this was you, no action is needed. If you don't recognize this activity, please:\n` +
    `1. Change your password immediately at https://elixiodigital.com/auth/login\n` +
    `2. Enable two-factor authentication (TOTP or passkey)\n` +
    `3. Review recent login activity in your account settings\n\n` +
    `This is an automated security notice from Elixio Digital.`;
  return {
    to: "",
    subject: `New sign-in to Elixio from ${args.location}`,
    text,
    html: emailShell(
      "New sign-in to your account",
      `<p>Hi ${args.displayName},</p>` +
        `<p>We noticed a new sign-in to your Elixio Digital account.</p>` +
        `<table style="width:100%;border-collapse:collapse;margin:24px 0">` +
        `<tr><td style="padding:8px 0;color:#666;width:80px">When</td><td style="padding:8px 0"><strong>${time}</strong></td></tr>` +
        `<tr><td style="padding:8px 0;color:#666">Where</td><td style="padding:8px 0"><strong>${args.location}</strong></td></tr>` +
        `<tr><td style="padding:8px 0;color:#666">IP</td><td style="padding:8px 0;font-family:monospace;font-size:13px">${args.ip}</td></tr>` +
        `<tr><td style="padding:8px 0;color:#666">Device</td><td style="padding:8px 0;font-size:13px">${args.userAgent}</td></tr>` +
        `</table>` +
        `<p style="background:#FFF0F0;border-left:4px solid #E11;padding:12px 16px;border-radius:4px">` +
        `<strong>Wasn't you?</strong> Change your password and enable two-factor authentication.` +
        `</p>` +
        `<p style="margin:24px 0"><a href="https://elixiodigital.com/auth/login" style="background:#E11;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Secure my account</a></p>` +
        `<p style="color:#666;font-size:13px">If this was you, no action is needed. This is an automated security notice.</p>`
    ),
  };
}

function emailShell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#FFFDF5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<div style="margin-bottom:24px"><strong style="color:#7B61FF;font-size:18px">elixio</strong> <span style="color:#7B61FF;letter-spacing:2px;font-size:11px;font-weight:700">DIGITAL</span></div>
<h1 style="font-size:24px;margin:0 0 16px">${title}</h1>
${body}
<hr style="border:none;border-top:1px solid #eee;margin:32px 0">
<p style="color:#666;font-size:12px">© Elixio Digital · <a href="mailto:support@elixiodigital.com" style="color:#7B61FF">support@elixiodigital.com</a></p>
</div></body></html>`;
}