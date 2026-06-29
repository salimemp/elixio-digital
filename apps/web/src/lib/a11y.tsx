"use client";

/**
 * Accessibility primitives — client-side hooks for the WCAG 2.1 AA layer.
 *
 * - `useA11yPrefs` detects `prefers-reduced-motion`, `prefers-contrast`,
 *   `prefers-color-scheme`, OS font size, etc.
 * - `useAnnouncer` posts messages to a single polite live region so screen
 *   readers announce route changes, form errors, action results, etc.
 * - The constants `LIVE_REGION_ID` and `ASSERTIVE_REGION_ID` are shared
 *   with `<LiveRegions>` which renders the actual DOM nodes once at the
 *   app root.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const LIVE_REGION_ID = "elixio-a11y-polite";
export const ASSERTIVE_REGION_ID = "elixio-a11y-assertive";

export type ContrastPref = "normal" | "more" | "less" | "custom";
export type MotionPref = "no-preference" | "reduce";
export type FontScale = 0.875 | 1 | 1.125 | 1.25 | 1.5;

export interface A11yPrefs {
  /** User prefers reduced motion (or null if unknown / SSR). */
  motion: MotionPref;
  /** User prefers higher contrast. */
  contrast: ContrastPref;
  /** System font scale multiplier — also writable. */
  fontScale: FontScale;
  /** TTS enabled. */
  ttsEnabled: boolean;
  /** TTS rate (0.5–2.0). */
  ttsRate: number;
  /** TTS pitch (0–2). */
  ttsPitch: number;
}

const DEFAULT_PREFS: A11yPrefs = {
  motion: "no-preference",
  contrast: "normal",
  fontScale: 1,
  ttsEnabled: false,
  ttsRate: 1,
  ttsPitch: 1,
};

const STORAGE_KEY = "elixio_a11y_prefs";

function readStored(): Partial<A11yPrefs> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeStored(prefs: A11yPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota errors */
  }
}

function detectMotion(): MotionPref {
  if (typeof window === "undefined") return "no-preference";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "reduce"
    : "no-preference";
}

function detectContrast(): ContrastPref {
  if (typeof window === "undefined") return "normal";
  if (window.matchMedia("(prefers-contrast: more)").matches) return "more";
  if (window.matchMedia("(prefers-contrast: less)").matches) return "less";
  return "normal";
}

/**
 * A11y preferences hook. Reads system prefs on mount and exposes a
 * writable store backed by localStorage. Components that need to react
 * to changes (e.g. the TTS engine) re-render on every update.
 */
export function useA11yPrefs(): {
  prefs: A11yPrefs;
  setPref: <K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => void;
  reset: () => void;
} {
  const [prefs, setPrefs] = useState<A11yPrefs>(() => {
    const stored = readStored();
    return { ...DEFAULT_PREFS, ...stored };
  });

  // Detect system prefs on mount. The stored value wins if set.
  useEffect(() => {
    const motion = detectMotion();
    const contrast = detectContrast();
    setPrefs((current) => {
      const next = { ...current };
      // Only fill in from system if the user hasn't explicitly chosen
      // (we treat "no-preference" + no stored value as "not yet decided").
      if (motion !== current.motion && !Object.prototype.hasOwnProperty.call(readStored(), "motion")) {
        next.motion = motion;
      }
      if (contrast !== current.contrast && !Object.prototype.hasOwnProperty.call(readStored(), "contrast")) {
        next.contrast = contrast;
      }
      return next;
    });

    // Listen for system changes (e.g. user toggles dark mode at OS level).
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqContrastMore = window.matchMedia("(prefers-contrast: more)");
    const onMotionChange = (e: MediaQueryListEvent) => {
      setPrefs((c) => ({ ...c, motion: e.matches ? "reduce" : "no-preference" }));
    };
    const onContrastChange = (e: MediaQueryListEvent) => {
      setPrefs((c) => ({ ...c, contrast: e.matches ? "more" : "normal" }));
    };
    mqMotion.addEventListener("change", onMotionChange);
    mqContrastMore.addEventListener("change", onContrastChange);
    return () => {
      mqMotion.removeEventListener("change", onMotionChange);
      mqContrastMore.removeEventListener("change", onContrastChange);
    };
  }, []);

  // Apply font scale to <html> so the whole app inherits it.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.fontSize = `${prefs.fontScale * 16}px`;
  }, [prefs.fontScale]);

  // Apply data-* attributes so CSS can target them (e.g. reduce transitions).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.motion = prefs.motion;
    root.dataset.contrast = prefs.contrast;
    root.dataset.tts = prefs.ttsEnabled ? "on" : "off";
  }, [prefs.motion, prefs.contrast, prefs.ttsEnabled]);

  const setPref = useCallback(<K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      writeStored(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPrefs({ ...DEFAULT_PREFS, motion: detectMotion(), contrast: detectContrast() });
    writeStored({ ...DEFAULT_PREFS, motion: detectMotion(), contrast: detectContrast() });
  }, []);

  return { prefs, setPref, reset };
}

/**
 * Live-region announcer. Wraps both polite and assertive regions. Posts
 * a message to the polite region by default; pass `assertive: true` for
 * urgent messages (errors, alerts).
 *
 * The DOM nodes themselves are rendered ONCE at the app root by
 * `<LiveRegions>`. This hook just writes text to them.
 */
export function useAnnouncer(): {
  announce: (message: string, assertive?: boolean) => void;
} {
  const lastMessage = useRef("");

  const announce = useCallback((message: string, assertive = false) => {
    if (typeof document === "undefined") return;
    if (!message || message === lastMessage.current) {
      // Screen readers may not re-announce the same text. Suffix with a
      // zero-width space to force a change event.
      message = `${message}\u200B`;
    }
    lastMessage.current = message;
    const id = assertive ? ASSERTIVE_REGION_ID : LIVE_REGION_ID;
    const el = document.getElementById(id);
    if (!el) return;
    // Clear first so the change is detected, then set.
    el.textContent = "";
    // Use a microtask so the empty state is committed before the new text.
    queueMicrotask(() => {
      el.textContent = message;
    });
  }, []);

  return { announce };
}

/**
 * Renders the live regions. Mount once at the app root (e.g. in
 * `app/layout.tsx` inside the providers).
 */
export function LiveRegions() {
  return (
    <>
      <div
        id={LIVE_REGION_ID}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        id={ASSERTIVE_REGION_ID}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}