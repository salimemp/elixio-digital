"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n-client";
import { LOCALES, type Locale } from "@/lib/i18n";

/**
 * Language switcher. Renders a globe icon + current language code,
 * dropdown opens to show all 42 supported locales with native names.
 * The 5 priority languages (en/es/fr/de/hi/pt) get a small badge,
 * the rest show "needs review" indicator.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t, localeNativeName } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // 9 priority locales — translated end-to-end.
  // Sorted by approximate speaker count (en first since it's the
  // platform default; then the major non-English markets).
  const PRIORITY: Locale[] = ["en", "es", "fr", "de", "hi", "pt", "ar", "ur", "he"];
  const rest = (LOCALES as readonly Locale[]).filter((l) => !PRIORITY.includes(l));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("language.switch_to")}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-full border-2 border-gum-black bg-white px-3 py-1.5 text-sm font-bold text-gum-black hover:bg-gum-cream"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <circle cx="10" cy="10" r="7.5" />
          <path d="M2.5 10h15M10 2.5c2 2 3 4.5 3 7.5s-1 5.5-3 7.5M10 2.5c-2 2-3 4.5-3 7.5s1 5.5 3 7.5" />
        </svg>
        <span className="uppercase">{locale}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 max-h-[480px] w-72 overflow-y-auto rounded-2xl border-2 border-gum-black bg-white shadow-[0_6px_0_0_#111]"
        >
          <div className="border-b-2 border-gum-black bg-gum-cream px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-700">
              {t("language.select")}
            </p>
            <p className="mt-0.5 text-xs text-gray-600">
              {t("language.current")}: <span className="font-bold uppercase">{locale}</span>
            </p>
          </div>

          <div className="px-2 py-2">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gum-purple">
              ★ {t("common.continue") as string}
            </p>
            {PRIORITY.map((code) => (
              <LocaleRow
                key={code}
                code={code}
                name={localeNativeName(code)}
                current={code === locale}
                onClick={() => {
                  setLocale(code);
                  setOpen(false);
                }}
              />
            ))}
          </div>

          <div className="border-t-2 border-gum-black bg-gum-yellow/30 px-2 py-2">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-700">
              {t("language.needs_review")}
            </p>
            {rest.map((code) => (
              <LocaleRow
                key={code}
                code={code}
                name={localeNativeName(code)}
                current={code === locale}
                onClick={() => {
                  setLocale(code);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LocaleRow({
  code,
  name,
  current,
  onClick,
}: {
  code: Locale;
  name: string;
  current: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-gum-cream ${
        current ? "bg-gum-yellow font-bold" : ""
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="inline-block w-10 text-xs font-bold uppercase text-gray-500">{code}</span>
        <span>{name}</span>
      </span>
      {current && <span className="text-xs">✓</span>}
    </button>
  );
}