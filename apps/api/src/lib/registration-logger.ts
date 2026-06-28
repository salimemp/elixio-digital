/**
 * Registration audit log.
 *
 * Writes one JSON line per registration to a per-role log file:
 *   - logs/creators.log   — all signupType=creator events
 *   - logs/buyers.log     — all signupType=buyer events
 *   - logs/registrations.log  — combined audit trail
 *
 * The per-role split is what the operator needs to compare creator
 * vs buyer conversion funnels over time, and to spot abuse (e.g. one
 * IP creating many buyer accounts vs many creator accounts).
 *
 * We log a fully-structured record so the operator can pipe to jq,
 * load into a spreadsheet, or stream to a log aggregator (Datadog,
 * CloudWatch, etc.) without parsing.
 */

import fs from "node:fs";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), "logs");

type RegistrationEvent = {
  /** ISO-8601 timestamp */
  ts: string;
  /** Always "register" for now; future-proofs for "verify_email_resend" etc. */
  event: "register" | "register_failed" | "email_verified";
  /** "creator" | "buyer" — the chosen signup type */
  role: "creator" | "buyer";
  /** New user id (UUID) or null on failure */
  userId: string | null;
  /** Email (always lowercased) */
  email: string;
  /** Display name at signup time */
  displayName: string | null;
  /** IP address (string) or null if not provided */
  ip: string | null;
  /** User-Agent header (string) or null */
  userAgent: string | null;
  /** "ok" | "duplicate" | "weak_password" | "pwned_password" | "rate_limited" | "error" */
  outcome: "ok" | "duplicate" | "weak_password" | "pwned_password" | "rate_limited" | "error";
  /** Password strength score 0-4 if registration succeeded; undefined on failure */
  passwordScore?: 0 | 1 | 2 | 3 | 4;
  /** HIBP breach count if pwned; undefined otherwise */
  pwnedCount?: number;
  /** Free-form reason for failure outcomes */
  reason?: string;
};

const ensureLogDir = (): void => {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
};

/**
 * Allowlist of log filenames. Hardcoded to prevent path-traversal: even
 * if a caller passes something like `"../etc/passwd"`, the write is rejected.
 * CodeQL flags this as `js/http-to-file-access` because the filename flows
 * to fs.appendFileSync, but in practice only the three constants below are
 * ever passed.
 */
const ALLOWED_LOG_FILES = new Set(["creators.log", "buyers.log", "registrations.log"]);

const writeLine = (filename: string, line: string): void => {
  ensureLogDir();
  if (!ALLOWED_LOG_FILES.has(filename)) {
    throw new Error(`Refusing to write to non-allowlisted log file: ${filename}`);
  }
  fs.appendFileSync(path.join(LOG_DIR, filename), line + "\n", "utf8");
};

/**
 * Log a registration attempt. Always:
 *   1. Writes one JSON line to the appropriate file
 *      (logs/creators.log | logs/buyers.log | logs/registrations.log)
 *   2. Emits a structured stdout line so log aggregators
 *      (Railway, CloudWatch, Datadog) can ingest it
 *
 * The dual-emit pattern is intentional:
 *   - Local dev: file logs persist on disk
 *   - Production (Railway/containers): stdout logs survive
 *     container restarts and ship to the platform log stream
 *
 * Safe to call from anywhere; errors writing the log do NOT bubble
 * up (we never want logging to break signup).
 */
export const logRegistration = (event: RegistrationEvent): void => {
  const line = JSON.stringify(event);
  try {
    // 1. Stdout (always works, picked up by Railway logs)
    // Prefix so it's filterable in log viewers.
    // eslint-disable-next-line no-console
    console.log(`[registration] ${line}`);

    // 2. File (best-effort, may fail in ephemeral containers)
    writeLine("registrations.log", line);
    if (event.role === "creator") {
      writeLine("creators.log", line);
    } else if (event.role === "buyer") {
      writeLine("buyers.log", line);
    }
  } catch (err) {
    // Best-effort logging — never throw from a logger
    // eslint-disable-next-line no-console
    console.error("[registration-log] failed to write log line:", err);
  }
};
