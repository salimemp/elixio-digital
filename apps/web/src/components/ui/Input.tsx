import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

/**
 * Themed input. Uses CSS variables directly (not Tailwind tokens) so the
 * text color flips automatically with the theme:
 *   - bg-gum-cream (flips with theme)
 *   - text: var(--ink) — black in light, near-white in dark
 *   - border-gum-black (always black)
 *   - placeholder: var(--ink-subtle) — theme-aware muted
 */
export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-lg border-2 border-gum-black bg-gum-cream px-3 py-2 placeholder:ink-subtle focus:border-gum-purple focus:outline-none focus:ring-2 focus:ring-gum-purple ${className}`}
      style={{ color: "var(--ink)" }}
      {...props}
    />
  );
}
