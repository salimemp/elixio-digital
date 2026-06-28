"use client";

import type { PasswordStrength } from "@/lib/password";

type Props = {
  /** The bucketed strength (computed via scorePassword) */
  strength: PasswordStrength;
  /** True if the password was found in a known breach (HIBP) */
  pwned: boolean;
  /** The actual password — used to render live rule checks (letter/number/special) */
  password: string;
};

const STRENGTH_LABELS: Record<PasswordStrength, string> = {
  "very-weak": "Very weak",
  weak: "Weak",
  okay: "Okay",
  good: "Good",
  strong: "Strong",
};

const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  "very-weak": "bg-red-500",
  weak: "bg-orange-500",
  okay: "bg-yellow-500",
  good: "bg-lime-500",
  strong: "bg-emerald-500",
};

const STRENGTH_WIDTH: Record<PasswordStrength, string> = {
  "very-weak": "w-1/5",
  weak: "w-2/5",
  okay: "w-3/5",
  good: "w-4/5",
  strong: "w-5/5",
};

type Rule = {
  label: string;
  met: boolean;
  /** Plain-English explanation surfaced in a hover tooltip. */
  why: string;
};

const computeRules = (password: string): Rule[] => [
  {
    label: "8+ characters",
    met: password.length >= 8,
    why: "Length is the single biggest factor in password strength. Every extra character makes brute-force attacks exponentially harder — 8 chars is the minimum where offline cracking becomes impractical with strong hashing.",
  },
  {
    label: "1 letter",
    met: /[A-Za-z]/.test(password),
    why: "Real words and names give your password memorability. Combined with numbers and special characters, this is enough to defeat most dictionary attacks.",
  },
  {
    label: "1 number",
    met: /\d/.test(password),
    why: "Digits add 10× the keyspace per character. Even a single digit forces an attacker to try alphanumeric combinations, blowing up their search space.",
  },
  {
    label: "1 special character",
    met: /[^A-Za-z0-9\s]/.test(password),
    why: "Special characters (like ! @ # $ %) add another 32+ symbols to the keyspace. They're especially effective against precomputed rainbow tables because most don't include them.",
  },
];

/**
 * Live password strength meter + rule checklist + breach warning.
 * Pure presentational; the parent supplies the password so this stays
 * a controlled component (no internal state for the password itself).
 */
export function PasswordStrengthMeter({ strength, pwned, password }: Props) {
  const rules = computeRules(password);
  const visible = password.length > 0;

  if (!visible) return null;

  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      {/* Bar */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full transition-all ${STRENGTH_COLOR[strength]} ${STRENGTH_WIDTH[strength]}`}
          />
        </div>
        <span className="text-xs font-bold ink-muted">
          {STRENGTH_LABELS[strength]}
        </span>
      </div>

      {/* Rule checklist with "why we require this" tooltips.
          Tooltip uses a native <details> element so it works without
          JS and is keyboard-accessible (Enter/Space to open, Esc to
          close via the browser's built-in behavior). */}
      <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className="relative flex items-center gap-1.5"
          >
            <span
              aria-hidden="true"
              className={
                rule.met
                  ? "inline-flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700"
                  : "inline-flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full bg-gray-200 text-[10px] ink-subtle"
              }
            >
              {rule.met ? "✓" : "·"}
            </span>
            <details className="group inline">
              <summary
                className={
                  "inline cursor-help list-none border-b border-dotted border-current/30 outline-none focus:border-solid " +
                  (rule.met ? "text-emerald-700" : "ink-muted")
                }
                aria-label={`${rule.label}. Click to learn why we require this.`}
              >
                {rule.label}
              </summary>
              <div
                role="tooltip"
                className="absolute left-0 top-full z-20 mt-1 w-72 max-w-xs rounded-lg border-2 border-gum-black bg-gum-cream p-2 text-left text-[11px] font-normal leading-snug ink-default shadow-[0_4px_0_0_#111]"
              >
                <span className="font-bold">Why we require this: </span>
                {rule.why}
              </div>
            </details>
          </li>
        ))}
      </ul>

      {/* HIBP warning */}
      {pwned && (
        <p
          role="alert"
          className="rounded-md border-2 border-gum-black bg-gum-pink px-2 py-1.5 text-xs font-bold"
        >
          ⚠ This password has appeared in known data breaches. Choose
          a different one.
        </p>
      )}
    </div>
  );
}
