"use client";

import { useI18n } from "@/lib/i18n-client";

export default function AboutPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-4 text-3xl font-bold">{t("about.title")}</h1>
      <p className="ink-muted">{t("about.body")}</p>
    </div>
  );
}