/**
 * Avatar component. Renders either:
 *   1. A user-provided URL (avatarUrl field)
 *   2. An initials-based SVG with deterministic color from name hash
 *
 * No file upload required. The initials approach is privacy-preserving
 * (no third-party service needed) and works offline.
 *
 * Color generation: we hash the name (first 2 chars' charcode sum) to
 * pick from a 12-color palette. Same name → same color → visual stability
 * across the app.
 */

"use client";

import { useMemo } from "react";

// 12 brand-aligned colors for the initials background
const AVATAR_COLORS = [
  "#ff90e8", // gum-pink (default)
  "#7b61ff", // gum-purple
  "#f1e05a", // gum-yellow
  "#23a6d5", // gum-cyan
  "#96f7d6", // gum-mint
  "#ff9f43", // gum-tangerine
  "#ff6b9d", // sunset pink
  "#4facfe", // ocean blue
  "#d299ff", // forest purple
  "#5d3fd3", // forest deep purple
  "#26ae60", // forest green
  "#ff4757", // sunset red
];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsFor(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  /** Display name used for fallback initials + color hash */
  name: string;
  /** Optional URL to a real avatar image */
  url?: string | null;
  /** Size in pixels (default 40) */
  size?: number;
  /** Add a ring/border (e.g., when avatar is in a card) */
  ring?: boolean;
  /** Override text color for the initials (defaults to ink-default = theme-aware) */
  textColor?: string;
  className?: string;
}

export function Avatar({
  name,
  url,
  size = 40,
  ring = false,
  textColor,
  className = "",
}: AvatarProps) {
  const bg = useMemo(() => colorForName(name || "?"), [name]);
  const initials = useMemo(() => initialsFor(name), [name]);
  const fontSize = Math.max(12, Math.floor(size * 0.4));

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ? `${name}'s avatar` : "User avatar"}
        width={size}
        height={size}
        className={`rounded-full object-cover ${ring ? "ring-2 ring-gum-black" : ""} ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name ? `${name}'s avatar` : "User avatar"}
      className={`flex items-center justify-center rounded-full font-extrabold uppercase select-none ${ring ? "ring-2 ring-gum-black" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: textColor ?? "#111111", // always dark on the colored bg
        fontSize,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
}

/**
 * Deterministic SVG avatar (data URL) — same input always produces
 * the same SVG string. Useful for `<meta property="og:image">` or any
 * place where you need a URL string, not a JSX component.
 *
 * Returns: `data:image/svg+xml;utf8,...`
 */
export function avatarDataUrl(name: string): string {
  const bg = colorForName(name || "?");
  const initials = initialsFor(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="48" font-weight="800" fill="#111111">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}