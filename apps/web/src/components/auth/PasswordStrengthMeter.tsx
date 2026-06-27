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
};

const computeRules = (password: string): Rule[] => [
  { label: "8+ characters", met: password.length >= 8 },
  { label: "1 letter", met: /[A-Za-z]/.test(password) },
  { label: "1 number", met: /\d/.test(password) },
  { label: "1 special character", met: /[^A-Za-z0-9\s]/.test(password) },
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
        <span className="text-xs font-bold text-gray-600">
          {STRENGTH_LABELS[strength]}
        </span>
      </div>

      {/* Rule checklist */}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className={
              rule.met
                ? "flex items-center gap-1.5 text-emerald-700"
                : "flex items-center gap-1.5 text-gray-500"
            }
          >
            <span
              aria-hidden="true"
              className={
                rule.met
                  ? "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700"
                  : "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-200 text-[10px] text-gray-400"
              }
            >
              {rule.met ? "✓" : "·"}
            </span>
            {rule.label}
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
