import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (!resend) {
    // Dev fallback: log to stdout so developers can copy the link
    // from their terminal.
    console.log(`\n📧 [DEV EMAIL] to=${msg.to} subject=${msg.subject}`);
    console.log(msg.text);
    console.log("");
    return;
  }
  const result = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
  if ("error" in result && result.error) {
    throw new Error(`Resend failed: ${result.error.message}`);
  }
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
