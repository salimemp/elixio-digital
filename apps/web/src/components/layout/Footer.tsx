"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";

/**
 * Site-wide footer. Adapts to light/dark via theme tokens (bg-gum-cream,
 * ink-default) — no hardcoded bg-gum-cream anywhere.
 */
export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="mt-16 border-t-2 border-gum-black bg-gum-cream">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        {/* Brand */}
        <div>
          <p className="text-xl font-extrabold ink-default">{t("common.app_name")}</p>
          <p className="mt-2 text-sm ink-default">
            {t("footer.tagline")}
          </p>
        </div>

        {/* Product */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide ink-default">
            {t("footer.product")}
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/explore" className="ink-default hover:underline">
                {t("nav.explore")}
              </Link>
            </li>
            <li>
              <Link href="/sell" className="ink-default hover:underline">
                {t("nav.start_selling")}
              </Link>
            </li>
            <li>
              <Link href="/blog" className="ink-default hover:underline">
                {t("footer.blog")}
              </Link>
            </li>
            <li>
              <Link href="/stats" className="ink-default hover:underline">
                {t("footer.stats")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Account */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide ink-default">
            {t("footer.account")}
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/auth/login" className="ink-default hover:underline">
                {t("nav.sign_in")}
              </Link>
            </li>
            <li>
              <Link href="/auth/register" className="ink-default hover:underline">
                {t("auth.create_account")}
              </Link>
            </li>
            <li>
              <Link href="/library" className="ink-default hover:underline">
                {t("nav.library")}
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="ink-default hover:underline">
                {t("nav.dashboard")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide ink-default">
            {t("footer.legal")}
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/privacy" className="ink-default hover:underline">
                {t("footer.privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="ink-default hover:underline">
                {t("footer.terms")}
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="ink-default hover:underline">
                {t("footer.cookies")}
              </Link>
            </li>
            <li>
              <a
                href="mailto:privacy@elixiodigital.com"
                className="ink-default hover:underline"
              >
                privacy@elixiodigital.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t-2 border-gum-black/10 px-4 py-4 text-center text-xs ink-default">
        © {new Date().getFullYear()} Elixio Digital · {t("footer.rights")}
      </div>
    </footer>
  );
}