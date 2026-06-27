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
import {
  DEFAULT_LOCALE,
  LOCALES,
  RTL_LOCALES,
  currencyForLocale,
  formatNumber,
  formatPrice,
  formatRelativeTime,
  localeDisplayName,
  localeNativeName,
  makeT,
  type Locale,
} from "./i18n";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  isRTL: boolean;
  currency: string;
  formatPrice: (cents: number, currency?: string) => string;
  formatRelativeTime: (date: Date | string) => string;
  formatNumber: (n: number) => string;
  localeNativeName: (code?: Locale) => string;
  localeDisplayName: (code?: Locale) => string;
  available: typeof LOCALES;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const COOKIE_NAME = "locale";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
}

// Lazy message loader for client. The server side loads the same way
// (lib/i18n.ts). We import statically so the chunks ship with the
// initial JS bundle (small files, no waterfall).
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import fr from "../../messages/fr.json";
import de from "../../messages/de.json";
import hi from "../../messages/hi.json";
import pt from "../../messages/pt.json";
import ar from "../../messages/ar.json";
import he from "../../messages/he.json";
import ur from "../../messages/ur.json";

const CLIENT_MESSAGES: Partial<Record<Locale, unknown>> = {
  en, es, fr, de, hi, pt, ar, he, ur,
};

function loadClientMessages(locale: Locale): Record<string, unknown> {
  // For scaffolded locales (not in CLIENT_MESSAGES), English is the
  // fallback at lookup time. The scaffold file only has metadata.
  if (locale === "en") return en as Record<string, unknown>;
  const msgs = CLIENT_MESSAGES[locale];
  if (!msgs) return en as Record<string, unknown>;
  return msgs as Record<string, unknown>;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Hydrate locale from cookie on mount (covers users who switched
  // language before navigating client-side).
  useEffect(() => {
    const cookieLocale = readCookie(COOKIE_NAME);
    if (cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)) {
      setLocaleState(cookieLocale as Locale);
    }
  }, []);

  // Apply RTL direction at the document level.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr";
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    writeCookie(COOKIE_NAME, l);
  }, []);

  const messages = useMemo(() => loadClientMessages(locale), [locale]);
  const t = useMemo(() => makeT(messages), [messages]);
  const isRTL = RTL_LOCALES.has(locale);
  const currency = currencyForLocale(locale);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      isRTL,
      currency,
      formatPrice: (cents: number, c?: string) => formatPrice(cents, c ?? currency, locale),
      formatRelativeTime: (d: Date | string) => formatRelativeTime(d, locale),
      formatNumber: (n: number) => formatNumber(n, locale),
      localeNativeName: (code?: Locale) => localeNativeName(code ?? locale),
      localeDisplayName: (code?: Locale) => localeDisplayName(code ?? locale, locale),
      available: LOCALES,
    }),
    [locale, setLocale, t, isRTL, currency]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export function useT() {
  return useI18n().t;
}