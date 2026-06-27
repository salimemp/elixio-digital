"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";

/**
 * Home page. Uses i18n for all user-facing strings. Pure client
 * component since the page itself is static and the i18n runtime
 * reads the locale from the cookie set by the navbar switcher.
 */
export default function HomePage() {
  const { t, locale, formatPrice, formatNumber, localeNativeName } = useI18n();

  return (
    <main className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center px-6 py-20 text-center">
      <span className="mb-6 inline-block rounded-full border-2 border-gum-black bg-gum-yellow px-4 py-1 text-sm font-bold uppercase tracking-wide">
        {t("home.badge")}
      </span>
      <h1 className="mb-6 max-w-4xl text-5xl font-extrabold leading-tight md:text-7xl">
        {t("home.headline_prefix")}{" "}
        <span className="text-gum-purple">{t("home.headline_suffix")}</span>
      </h1>
      <p className="mb-10 max-w-2xl text-xl ink-muted">{t("home.description")}</p>

      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/explore" className="gum-btn-primary text-lg">
          {t("home.cta_explore")}
        </Link>
        <Link href="/sell" className="gum-btn-yellow text-lg">
          {t("home.cta_sell")}
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
        <FeatureCard
          color="bg-gum-pink"
          title={t("home.feature_showcase_title")}
          text={t("home.feature_showcase_text")}
        />
        <FeatureCard
          color="bg-gum-cyan"
          title={t("home.feature_market_title")}
          text={t("home.feature_market_text")}
        />
        <FeatureCard
          color="bg-gum-mint"
          title={t("home.feature_sell_title")}
          text={t("home.feature_sell_text")}
        />
      </div>

      {/* Live locale indicator — shows the user which locale they're seeing */}
      <p className="mt-12 text-xs ink-subtle">
        {t("language.current")}:{" "}
        <span className="font-bold uppercase">{locale}</span> ({localeNativeName()}) ·
        {" "}{t("home.cta_explore")} in {formatPrice(1500, "USD")} →{" "}
        {formatPrice(1500 * 1.0725, "USD")} ({formatNumber(8)} US states apply tax)
      </p>
    </main>
  );
}

function FeatureCard({
  color,
  title,
  text,
}: {
  color: string;
  title: string;
  text: string;
}) {
  return (
    <div className="gum-card text-left">
      <span aria-hidden="true" className={`mb-3 inline-block h-10 w-10 rounded-full border-2 border-gum-black ${color}`} />
      <h3 className="mb-1 text-lg font-extrabold">{title}</h3>
      <p className="text-sm ink-muted">{text}</p>
    </div>
  );
}