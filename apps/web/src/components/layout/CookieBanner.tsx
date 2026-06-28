"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";

/**
 * Cookie consent banner (GDPR + ePrivacy + CCPA compliant).
 *
 * Storage: `localStorage["elixio-cookie-consent"]` = "accepted" | "declined".
 * Valid for 12 months per GDPR Article 5(1)(e) storage limitation.
 *
 * Behavior:
 *   - First visit (no key): banner slides up from the bottom.
 *   - User clicks Accept → store "accepted", hide banner.
 *   - User clicks Decline → store "declined", hide banner.
 *   - User clicks "Read more" → link goes to /cookies page.
 *   - Both choices are equally prominent (no dark patterns).
 *
 * Theme safety: uses bg-gum-cream + ink-default so it adapts to mode.
 */
export function CookieBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on the client; check consent status.
    try {
      const stored = window.localStorage.getItem("elixio-cookie-consent");
      if (!stored) {
        // Slight delay so it doesn't compete with first-paint LCP.
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage blocked (private mode, etc.) — show banner anyway.
      setVisible(true);
    }
  }, []);

  const decide = (choice: "accepted" | "declined") => {
    try {
      window.localStorage.setItem("elixio-cookie-consent", choice);
      // Optional: tag with timestamp for audit trail
      window.localStorage.setItem(
        "elixio-cookie-consent-at",
        new Date().toISOString()
      );
    } catch {
      // Ignore — banner will reappear next visit.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("cookie.title")}
      className="fixed inset-x-0 bottom-0 z-50 p-4"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border-2 border-gum-black bg-gum-cream p-5 shadow-[0_6px_0_0_#111] md:flex-row md:items-center md:gap-6">
        <div className="flex-1">
          <p className="text-base font-extrabold ink-default">
            {t("cookie.title")}
          </p>
          <p className="mt-1 text-sm ink-default">
            {t("cookie.body")}{" "}
            <Link
              href="/cookies"
              className="font-semibold text-gum-purple underline"
            >
              {t("cookie.read_more")}
            </Link>
            ,{" "}
            <Link
              href="/privacy"
              className="font-semibold text-gum-purple underline"
            >
              {t("footer.privacy")}
            </Link>
            , or{" "}
            <Link
              href="/terms"
              className="font-semibold text-gum-purple underline"
            >
              {t("footer.terms")}
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide("declined")}
            className="rounded-full border-2 border-gum-black bg-gum-cream px-4 py-2 text-sm font-bold ink-default transition hover:bg-gum-mint"
          >
            {t("cookie.decline")}
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="rounded-full border-2 border-gum-black bg-gum-purple px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
          >
            {t("cookie.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}