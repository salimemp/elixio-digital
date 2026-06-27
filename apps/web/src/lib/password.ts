/**
 * Client-side password helpers — mirror the server's `password-security`
 * module. The score function is a pure function (no network) so it
 * runs synchronously on every keystroke. The HIBP check is a network
 * call wrapped in a debounce inside the component.
 *
 * NOTE: The server is the source of truth. The client checks are UX
 * (instant feedback) and a quick first line of defense, but a tampered
 * client cannot bypass the server's `checkPassword()`.
 */

export type PasswordStrength = "very-weak" | "weak" | "okay" | "good" | "strong";

const hasLower = (s: string) => /[a-z]/.test(s);
const hasUpper = (s: string) => /[A-Z]/.test(s);
const hasNumber = (s: string) => /\d/.test(s);
const hasSpecial = (s: string) => /[^A-Za-z0-9\s]/.test(s);

export const scorePassword = (password: string): PasswordStrength => {
  if (!password) return "very-weak";
  const classes = [
    hasLower(password),
    hasUpper(password),
    hasNumber(password),
    hasSpecial(password),
  ].filter(Boolean).length;

  const hasLetter = hasLower(password) || hasUpper(password);
  const allRulesMet = hasLetter && hasNumber(password) && hasSpecial(password);

  if (!allRulesMet) return "very-weak";
  if (password.length < 10) return "weak";
  if (password.length < 12) return "okay";
  if (password.length >= 16 && classes >= 4) return "strong";
  return "good";
};

/* ------------------------------------------------------------------------- */
/*  Client-side HIBP Pwned Passwords check (k-anonymity model)                */
/* ------------------------------------------------------------------------- */

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range";
const HIBP_TIMEOUT_MS = 1500;

const sha1Hex = async (password: string): Promise<string> => {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-1", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
};

export type PwnedResult = { pwned: boolean; count: number };

/**
 * Returns `{ pwned, count }`. Fails open on network failure (returns
 * `{ pwned: false, count: 0 }`) — the server is the source of truth.
 */
export const checkPwnedClient = async (password: string): Promise<PwnedResult> => {
  if (!password) return { pwned: false, count: 0 };
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${HIBP_RANGE_URL}/${prefix}`, {
        method: "GET",
        headers: { "Add-Padding": "true" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) return { pwned: false, count: 0 };

    const text = await res.text();
    for (const line of text.split("\n")) {
      const [s, c] = line.trim().split(":");
      if (s && s.toUpperCase() === suffix) {
        return { pwned: true, count: parseInt(c ?? "0", 10) || 0 };
      }
    }
    return { pwned: false, count: 0 };
  } catch {
    return { pwned: false, count: 0 };
  }
};
