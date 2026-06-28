"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n-client";
import { BRAND_LABELS, useTheme, type BrandPalette, type ThemeMode } from "@/lib/theme";

/**
 * Theme switcher. Two controls:
 *   1. Mode (light/dark/system) — 3-icon row
 *   2. Brand palette (default/sunset/ocean/forest) — 4 swatches
 *
 * Both persist to localStorage + apply CSS variables / dark class
 * immediately on click (no full reload).
 */
export function ThemeSwitcher() {
  const { t } = useI18n();
  const { mode, brand, setMode, setBrand, effectiveMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("theme.select")}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gum-black bg-gum-cream hover:bg-gum-cream"
        title={`${t("theme.select")}: ${mode} / ${BRAND_LABELS[brand]}`}
      >
        {/* Show sun/moon based on effective mode */}
        {effectiveMode === "dark" ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border-2 border-gum-black bg-gum-cream shadow-[0_6px_0_0_#111]"
        >
          {/* Mode selector */}
          <div className="border-b-2 border-gum-black bg-gum-cream px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide ink-default">
              {t("theme.select")}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1 p-2">
            {(["light", "dark", "system"] as ThemeMode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="menuitemradio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-bold ink-default transition ${
                  mode === m ? "bg-gum-yellow" : "hover:bg-gum-mint"
                }`}
              >
                <ModeIcon mode={m} />
                <span>{t(`theme.${m}`)}</span>
              </button>
            ))}
          </div>

          {/* Brand palette selector */}
          <div className="border-t-2 border-gum-black px-3 py-2">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide ink-default">
              {t("theme.brand")}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(BRAND_LABELS) as BrandPalette[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  role="menuitemradio"
                  aria-checked={brand === b}
                  onClick={() => setBrand(b)}
                  title={BRAND_LABELS[b]}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2 ink-default transition ${
                    brand === b ? "bg-gum-yellow" : "hover:bg-gum-mint"
                  }`}
                >
                  <BrandSwatch brand={b} />
                  <span className="text-[10px] font-bold uppercase">
                    {t(`theme.brand_${b}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  if (mode === "dark") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function BrandSwatch({ brand }: { brand: BrandPalette }) {
  // Visual representation of each brand's primary colors.
  const colors: Record<BrandPalette, [string, string, string]> = {
    default: ["#ff90e8", "#7b61ff", "#f1e05a"],
    sunset: ["#ff6b9d", "#ff4757", "#ffa502"],
    ocean: ["#4facfe", "#5c6bc0", "#00f2fe"],
    forest: ["#d299ff", "#5d3fd3", "#c8e265"],
  };
  const [a, b, c] = colors[brand];
  return (
    <div
      className="h-8 w-8 rounded-full border-2 border-gum-black"
      style={{ background: `linear-gradient(135deg, ${a} 0%, ${b} 50%, ${c} 100%)` }}
    />
  );
}