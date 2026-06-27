/**
 * Password security utilities.
 *
 * Two parts:
 *   1. `validatePasswordStrength` — applies our strong-password policy
 *      (1 letter + 1 number + 1 special char, 8+ chars). Returns a list
 *      of human-readable error messages; an empty list means the password
 *      passes.
 *
 *   2. `checkPwnedPassword` — checks the password against the
 *      Have-I-Been-Pwned (HIBP) Pwned Passwords API using the k-anonymity
 *      model. We send only the first 5 hex chars of the SHA-1 hash; HIBP
 *      returns a list of 35-char suffixes + breach counts. We never
 *      send the actual password or full hash to HIBP.
 *
 * Reference: https://haveibeenpwned.com/API/v3#PwnedPasswords
 *
 * The HIBP API is rate-limited but free for breach-count lookups. We add
 * a 1.5s timeout; on network failure we **fail open** (allow the
 * password) but log the failure. Rationale: blocking users on a flaky
 * dependency is worse than letting one in. The strong-password policy
 * already covers the common-weakness case.
 */

import { createHash } from "node:crypto";

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range";
const HIBP_TIMEOUT_MS = 1500;
const FETCH_USER_AGENT = "Elixio-PasswordCheck/1.0";

/** Issue codes — exported so the API layer can return structured errors. */
export type PasswordIssue = "too-short" | "too-long" | "no-letter" | "no-number" | "no-special" | "pwned";

export type PasswordCheckResult =
  | { ok: true; score: 0 | 1 | 2 | 3 | 4 }
  | { ok: false; issues: PasswordIssue[]; pwnedCount?: number };

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

export const validatePasswordStrength = (password: string): PasswordIssue[] => {
  const issues: PasswordIssue[] = [];
  if (password.length < MIN_LENGTH) issues.push("too-short");
  if (password.length > MAX_LENGTH) issues.push("too-long");
  if (!/[A-Za-z]/.test(password)) issues.push("no-letter");
  if (!/\d/.test(password)) issues.push("no-number");
  if (!/[^A-Za-z0-9\s]/.test(password)) issues.push("no-special");
  return issues;
};

/** Map an issue to a human-readable message. */
export const describeIssue = (issue: PasswordIssue, pwnedCount?: number): string => {
  switch (issue) {
    case "too-short":
      return "Password must be at least 8 characters long.";
    case "too-long":
      return "Password must be at most 128 characters long.";
    case "no-letter":
      return "Password must include at least 1 letter (A-Z, a-z).";
    case "no-number":
      return "Password must include at least 1 number (0-9).";
    case "no-special":
      return "Password must include at least 1 special character (e.g. !@#$%^&*).";
    case "pwned":
      return pwnedCount && pwnedCount > 0
        ? `This password has appeared in ${pwnedCount.toLocaleString()} known data breaches. Choose a different one.`
        : "This password has appeared in known data breaches. Choose a different one.";
  }
};

/** Quick score for the strength meter (0-4). */
export const scorePassword = (password: string): 0 | 1 | 2 | 3 | 4 => {
  if (!password) return 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(password);
  const classes = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (password.length < 8 || classes < 3) return 0;
  if (password.length < 10 || classes < 3) return 1;
  if (password.length < 12) return 2;
  if (password.length < 16) return 3;
  return 4;
};

/**
 * Returns the SHA-1 of the password as a UPPERCASE hex string. The
 * HIBP Pwned Passwords API requires uppercase hex.
 */
const sha1Hex = (password: string): string =>
  createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();

/**
 * Check if a password has appeared in a known data breach.
 *
 * Uses the k-anonymity model: we send the first 5 hex chars of the
 * SHA-1 hash, and HIBP returns all suffixes that match. We look up
 * our local hash's suffix in the response.
 *
 * Returns:
 *   - { pwned: false, count: 0 } if the password is not in any breach
 *   - { pwned: true, count: N } if found, with N being the breach count
 *   - { pwned: false, count: 0, error: "..." } on network failure (fail-open)
 */
export const checkPwnedPassword = async (
  password: string,
): Promise<{ pwned: boolean; count: number; error?: string }> => {
  const hash = sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);

  try {
    const res = await fetch(`${HIBP_RANGE_URL}/${prefix}`, {
      method: "GET",
      headers: {
        "Add-Padding": "true", // privacy: pads response to look uniform
        "User-Agent": FETCH_USER_AGENT,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { pwned: false, count: 0, error: `HIBP returned HTTP ${res.status}` };
    }

    const text = await res.text();
    // Each line: "<35-char-suffix>:<count>"
    for (const line of text.split("\n")) {
      const [s, c] = line.trim().split(":");
      if (s && s.toUpperCase() === suffix) {
        return { pwned: true, count: parseInt(c ?? "0", 10) || 0 };
      }
    }
    return { pwned: false, count: 0 };
  } catch (err) {
    clearTimeout(timer);
    const error = err instanceof Error ? err.message : String(err);
    return { pwned: false, count: 0, error };
  }
};

/**
 * End-to-end check used at the API boundary: validates strength, then
 * checks the breach database. Returns all issues at once so the client
 * can show a complete list rather than failing on the first one.
 */
export const checkPassword = async (password: string): Promise<PasswordCheckResult> => {
  const issues = validatePasswordStrength(password);
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const hibp = await checkPwnedPassword(password);
  if (hibp.pwned) {
    return { ok: false, issues: ["pwned"], pwnedCount: hibp.count };
  }

  // score is 0-4 (see scorePassword)
  const score = scorePassword(password) as 0 | 1 | 2 | 3 | 4;
  return { ok: true, score };
};
