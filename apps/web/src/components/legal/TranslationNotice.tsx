/**
 * Translation notice shown at the top of legal pages when the user's
 * locale is not English. English is the canonical legal text — all
 * other locales are convenience translations until reviewed by a
 * professional translator.
 *
 * Server component (reads the locale cookie directly).
 */
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, resolveLocaleFromCookie, type Locale } from "@/lib/i18n";

export function TranslationNotice() {
  const cookieStore = cookies();
  const locale: Locale = resolveLocaleFromCookie(cookieStore.get("locale")?.value) ?? DEFAULT_LOCALE;

  if (locale === "en") return null;

  // Per-locale friendly names for the notice
  const names: Partial<Record<Locale, string>> = {
    es: "Spanish",
    fr: "French",
    de: "German",
    hi: "Hindi",
    pt: "Portuguese",
    ar: "Arabic",
    ur: "Urdu",
    he: "Hebrew",
  };
  const languageName = names[locale] ?? locale.toUpperCase();

  return (
    <aside className="mb-8 rounded-2xl border-2 border-gum-yellow bg-gum-cream p-5">
      <p className="mb-2 text-sm font-extrabold ink-default">
        📜 Translation notice — {languageName}
      </p>
      <p className="text-sm ink-muted">
        This is a courtesy translation. The canonical legal text is in
        English (below). If there is any difference between this
        translation and the English version, the English version
        prevails. For the legally binding version, see the{" "}
        <a href="/" className="font-semibold text-gum-purple underline">
          English version
        </a>
        .
      </p>
    </aside>
  );
}
