"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Theme system — two-axis:
 *   1. Mode: light / dark / system
 *   2. Brand palette: default / sunset / ocean / forest
 *
 * The mode controls Tailwind's `dark` class + the `data-theme` attr.
 * The brand palette swaps CSS custom properties (--gum-pink, --gum-purple, …).
 *
 * Persistence: localStorage `elixio-theme` JSON `{mode, brand}`.
 * SSR-safe: starts with `system` and applies on mount to avoid hydration mismatch.
 */

export type ThemeMode = "light" | "dark" | "system";
export type BrandPalette = "default" | "sunset" | "ocean" | "forest";

interface ThemeState {
  mode: ThemeMode;
  brand: BrandPalette;
}

interface ThemeContextValue extends ThemeState {
  setMode: (mode: ThemeMode) => void;
  setBrand: (brand: BrandPalette) => void;
  toggleMode: () => void;
  /** The effective mode (resolved from system if mode === "system"). */
  effectiveMode: "light" | "dark";
}

const STORAGE_KEY = "elixio-theme";

// Brand palette tokens. Each defines the gum-* colors used throughout
// the app. Switching brands swaps CSS variables on <html data-brand="…">.
const PALETTES: Record<BrandPalette, Record<string, string>> = {
  default: {
    "--gum-pink": "#ff90e8",
    "--gum-purple": "#7b61ff",
    "--gum-yellow": "#f1e05a",
    "--gum-cyan": "#23a6d5",
    "--gum-mint": "#96f7d6",
    "--gum-tangerine": "#ff9f43",
    "--gum-black": "#111111",
    "--gum-cream": "#fffdf5",
  },
  sunset: {
    "--gum-pink": "#ff6b9d",
    "--gum-purple": "#ff4757",
    "--gum-yellow": "#ffa502",
    "--gum-cyan": "#ff6348",
    "--gum-mint": "#ffdd59",
    "--gum-tangerine": "#ff793f",
    "--gum-black": "#1a0e0a",
    "--gum-cream": "#fff7ed",
  },
  ocean: {
    "--gum-pink": "#4facfe",
    "--gum-purple": "#5c6bc0",
    "--gum-yellow": "#00f2fe",
    "--gum-cyan": "#00b4db",
    "--gum-mint": "#43e97b",
    "--gum-tangerine": "#38f9d7",
    "--gum-black": "#0c1e3d",
    "--gum-cream": "#f0f9ff",
  },
  forest: {
    "--gum-pink": "#d299ff",
    "--gum-purple": "#5d3fd3",
    "--gum-yellow": "#c8e265",
    "--gum-cyan": "#26ae60",
    "--gum-mint": "#7bed9f",
    "--gum-tangerine": "#ffa940",
    "--gum-black": "#0d1f1a",
    "--gum-cream": "#f4faf4",
  },
};

const DEFAULT_STATE: ThemeState = { mode: "system", brand: "default" };

function readState(): ThemeState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ThemeState>;
    return {
      mode: ["light", "dark", "system"].includes(parsed.mode as string) ? (parsed.mode as ThemeMode) : "system",
      brand: ["default", "sunset", "ocean", "forest"].includes(parsed.brand as string) ? (parsed.brand as BrandPalette) : "default",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(state: ThemeState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function applyTheme(state: ThemeState, systemDark: boolean): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const effective: "light" | "dark" =
    state.mode === "system" ? (systemDark ? "dark" : "light") : state.mode;
  document.documentElement.classList.toggle("dark", effective === "dark");
  document.documentElement.dataset.theme = effective;
  document.documentElement.dataset.brand = state.brand;

  // Apply brand palette FIRST as CSS variables on <html>.
  // Then apply mode-specific overrides (dark mode variants for cream + ink)
  // LAST so they win in dark mode. Order matters: inline styles always win
  // over class selectors, so the dark overrides need to be applied AFTER the
  // brand palette would otherwise overwrite them.
  const tokens = PALETTES[state.brand] ?? PALETTES.default;
  for (const [key, value] of Object.entries(tokens)) {
    document.documentElement.style.setProperty(key, value);
  }

  // Mode-specific overrides. In dark mode, swap cream → near-black and
  // ink → near-white. These values intentionally mirror the .dark
  // selector in globals.css so the theme is consistent regardless of
  // whether the dark class was applied via React or pre-hydration script.
  if (effective === "dark") {
    document.documentElement.style.setProperty("--gum-cream", "#0a0a0a");
    document.documentElement.style.setProperty("--surface", "#0a0a0a");
    document.documentElement.style.setProperty("--surface-muted", "#171717");
    document.documentElement.style.setProperty("--surface-subtle", "#0f0f0f");
    document.documentElement.style.setProperty("--ink", "#fafafa");
    document.documentElement.style.setProperty("--ink-muted", "#d4d4d4");
    document.documentElement.style.setProperty("--ink-subtle", "#a3a3a3");
  }
  return effective;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(DEFAULT_STATE);
  const [systemDark, setSystemDark] = useState(false);
  const [effectiveMode, setEffectiveMode] = useState<"light" | "dark">("light");

  // Hydrate from localStorage + listen for OS theme changes
  useEffect(() => {
    const stored = readState();
    setState(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Apply whenever state or system pref changes
  useEffect(() => {
    setEffectiveMode(applyTheme(state, systemDark));
  }, [state, systemDark]);

  const setMode = useCallback((mode: ThemeMode) => {
    setState((prev) => {
      const next = { ...prev, mode };
      writeState(next);
      return next;
    });
  }, []);

  const setBrand = useCallback((brand: BrandPalette) => {
    setState((prev) => {
      const next = { ...prev, brand };
      writeState(next);
      return next;
    });
  }, []);

  const toggleMode = useCallback(() => {
    setMode(effectiveMode === "dark" ? "light" : "dark");
  }, [effectiveMode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ ...state, effectiveMode, setMode, setBrand, toggleMode }),
    [state, effectiveMode, setMode, setBrand, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

export const BRAND_LABELS: Record<BrandPalette, string> = {
  default: "Default",
  sunset: "Sunset",
  ocean: "Ocean",
  forest: "Forest",
};