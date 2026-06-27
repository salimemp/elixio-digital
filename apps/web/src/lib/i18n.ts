/**
 * Lightweight i18n runtime. Server reads locale from the `locale` cookie
 * (set by the navbar switcher). Client uses a context provider so
 * components re-render when the user changes language.
 *
 * Why not next-intl? Restructuring all routes under [locale] is invasive
 * for a marketing site. Cookie-based locale keeps URLs stable across
 * languages (good for SEO since /about serves the same content for any
 * language variant — Google's hreflang annotations handle language
 * signaling separately).
 */

import enMessages from "../../messages/en.json";

export const LOCALES = [
  // 5 priority — translated
  "en", "es", "fr", "de", "hi", "pt",
  // Scaffolded for 35+ — falling back to English until reviewed
  "ar", "bn", "bg", "ca", "zh", "zh-TW", "hr", "cs", "da", "nl",
  "et", "fi", "el", "he", "hu", "id", "it", "ja", "ko", "lv",
  "lt", "ms", "no", "pl", "ro", "ru", "sk", "sl", "sv", "ta",
  "te", "th", "tr", "uk", "ur", "vi",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const RTL_LOCALES: ReadonlySet<Locale> = new Set(["ar", "he", "ur"]);

const COOKIE_NAME = "locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Per-locale currency (used for default price formatting)
const LOCALE_CURRENCY: Partial<Record<Locale, string>> = {
  en: "USD", es: "EUR", fr: "EUR", de: "EUR", hi: "INR", pt: "BRL",
  ar: "AED", ja: "JPY", ko: "KRW", zh: "CNY", "zh-TW": "TWD",
  ru: "RUB", pl: "PLN", tr: "TRY", he: "ILS", vi: "VND",
  th: "THB", id: "IDR", ms: "MYR", no: "NOK", sv: "SEK",
  da: "DKK", fi: "EUR", nl: "EUR", it: "EUR", el: "EUR",
  cs: "CZK", hu: "HUF", ro: "RON", bg: "BGN", hr: "EUR",
  sk: "EUR", sl: "EUR", et: "EUR", lv: "EUR", lt: "EUR",
  uk: "UAH", bn: "INR", ta: "INR", te: "INR", ur: "PKR",
  ca: "EUR",
};

export function currencyForLocale(locale: Locale): string {
  return LOCALE_CURRENCY[locale] ?? "USD";
}

/**
 * Per-locale Intl tag (BCP 47). Most map 1:1 to the locale code;
 * zh-TW is the exception.
 */
const LOCALE_INTL: Partial<Record<Locale, string>> = {
  "zh-TW": "zh-Hant",
  zh: "zh-Hans",
  he: "he-IL",
};

export function intlTag(locale: Locale): string {
  return LOCALE_INTL[locale] ?? locale;
}

/**
 * Load the message bundle for a locale. Server-side uses require()
 * so all 36 JSONs ship with the server bundle (small files, ~1KB each).
 * For locales that only have metadata, falls back to English so the
 * scaffold files don't ship empty pages.
 */
function loadMessages(locale: Locale): Record<string, unknown> {
  if (locale === "en") return enMessages as Record<string, unknown>;
  try {
    const messages = require(`../../messages/${locale}.json`);
    const keys = Object.keys(messages).filter((k) => k !== "_meta");
    if (keys.length === 0) return enMessages as Record<string, unknown>;
    return messages;
  } catch {
    return enMessages as Record<string, unknown>;
  }
}

/**
 * Resolve the active locale from a request cookie header.
 * Falls back to DEFAULT_LOCALE if the cookie is missing or invalid.
 */
export function resolveLocaleFromCookie(cookieHeader: string | null | undefined): Locale {
  if (!cookieHeader) return DEFAULT_LOCALE;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const c of cookies) {
    const [name, value] = c.split("=");
    if (name === COOKIE_NAME && value) {
      const decoded = decodeURIComponent(value);
      if ((LOCALES as readonly string[]).includes(decoded)) {
        return decoded as Locale;
      }
    }
  }
  return DEFAULT_LOCALE;
}

export function setLocaleCookieHeader(locale: Locale): string {
  return `${COOKIE_NAME}=${encodeURIComponent(locale)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

/**
 * Server-side translation function. Walks the nested message object
 * by dot-notation key, falls back to English if missing, falls back
 * to the key itself as a last resort.
 * Interpolation: `{var}` placeholders replaced with values from `vars`.
 */
export function makeT(
  messages: Record<string, unknown>,
  fallback: Record<string, unknown> = enMessages as Record<string, unknown>
) {
  return function t(key: string, vars?: Record<string, string | number>): string {
    const parts = key.split(".");
    let value: unknown = messages;
    for (const p of parts) {
      if (value && typeof value === "object" && p in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[p];
      } else {
        value = undefined;
        break;
      }
    }
    if (value === undefined) {
      value = fallback;
      for (const p of parts) {
        if (value && typeof value === "object" && p in (value as Record<string, unknown>)) {
          value = (value as Record<string, unknown>)[p];
        } else {
          return key;
        }
      }
    }
    if (typeof value !== "string") return key;
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
  };
}

/**
 * Get the messages + t function for a given locale (server-side).
 */
export function getServerT(locale: Locale): {
  t: ReturnType<typeof makeT>;
  messages: Record<string, unknown>;
  locale: Locale;
  isRTL: boolean;
  currency: string;
} {
  const messages = loadMessages(locale);
  return {
    t: makeT(messages),
    messages,
    locale,
    isRTL: RTL_LOCALES.has(locale),
    currency: currencyForLocale(locale),
  };
}

/**
 * Format a price in cents using the locale's currency conventions.
 */
export function formatPrice(cents: number, currency: string, locale: Locale = DEFAULT_LOCALE): string {
  try {
    return new Intl.NumberFormat(intlTag(locale), {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/**
 * Format a date relative to now ("5 minutes ago").
 */
export function formatRelativeTime(date: Date | string, locale: Locale = DEFAULT_LOCALE): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const seconds = Math.floor(diffMs / 1000);
  try {
    const rtf = new Intl.RelativeTimeFormat(intlTag(locale), { numeric: "auto" });
    if (seconds < 60) return rtf.format(-seconds, "second");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return rtf.format(-minutes, "minute");
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return rtf.format(-hours, "hour");
    const days = Math.floor(hours / 24);
    return rtf.format(-days, "day");
  } catch {
    return d.toISOString();
  }
}

/**
 * Format a number per locale (thousands separator, decimal style).
 */
export function formatNumber(n: number, locale: Locale = DEFAULT_LOCALE): string {
  try {
    return new Intl.NumberFormat(intlTag(locale)).format(n);
  } catch {
    return String(n);
  }
}

/**
 * Display name for a locale code (e.g. "es" → "Español").
 */
export function localeDisplayName(code: Locale, inLocale: Locale = DEFAULT_LOCALE): string {
  try {
    const dn = new Intl.DisplayNames([intlTag(inLocale)], { type: "language" });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Get the human-readable native name for the picker.
 * Falls back to the locale code.
 */
export function localeNativeName(code: Locale): string {
  if (code === "zh-TW") return "繁體中文";
  try {
    const dn = new Intl.DisplayNames([code], { type: "language" });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}