"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { useAuth } from "@/lib/auth";
import { ProfileShell, SectionHeader, SettingsCard } from "@/components/profile/ProfileShell";

/**
 * Privacy & data sub-page. Three things:
 *
 *   1. **Data export** (GDPR Art. 15, CCPA Right to Know, PIPEDA 4.9) —
 *      request a downloadable JSON archive of all your data. Async via
 *      the backend's `/v1/users/me/export` endpoint; download link is
 *      emailed.
 *   2. **Cookie consent** — change/withdraw consent for non-essential
 *      cookies. (Stored client-side; same as the bottom banner.)
 *   3. **Sale opt-out** — CCPA Right to Opt-Out of Sale. We don't sell
 *      personal data; this is the disclosure + a signed ack.
 */

export default function PrivacyPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // Cookie consent (client-only; bottom banner does the same thing)
  const [consent, setConsent] = useState<{
    necessary: true;
    analytics: boolean;
    marketing: boolean;
  }>(() => {
    if (typeof window === "undefined") return { necessary: true, analytics: false, marketing: false };
    try {
      const raw = JSON.parse(localStorage.getItem("elixio_cookie_consent") || "{}");
      return {
        necessary: true,
        analytics: !!raw.analytics,
        marketing: !!raw.marketing,
      };
    } catch {
      return { necessary: true, analytics: false, marketing: false };
    }
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 ink-muted">
        {t("auth.sign_in_to_view_profile")}
      </div>
    );
  }

  const updateConsent = (key: "analytics" | "marketing", value: boolean) => {
    const next = { ...consent, [key]: value };
    setConsent(next);
    try {
      localStorage.setItem("elixio_cookie_consent", JSON.stringify(next));
    } catch {
      /* localStorage unavailable */
    }
  };

  const requestExport = async () => {
    setExporting(true);
    setExportMsg(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const token = localStorage.getItem("elixio_access_token");
      const res = await fetch(`${apiUrl}/v1/users/me/export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
      }
      setExportMsg({ kind: "ok", text: t("profile.privacy.export.requested") });
    } catch (e) {
      setExportMsg({
        kind: "error",
        text: e instanceof Error ? e.message : t("common.error"),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <ProfileShell user={user}>
      <SectionHeader
        title={t("profile.privacy.title")}
        description={t("profile.privacy.subtitle")}
      />

      {/* Data export */}
      <SettingsCard
        title={t("profile.privacy.export.title")}
        description={t("profile.privacy.export.subtitle")}
      >
        <p className="mb-3 text-sm ink-default">
          {t("profile.privacy.export.help")}
        </p>
        <ul className="mb-3 space-y-1 text-xs ink-muted">
          <li>• {t("profile.privacy.export.includes.profile")}</li>
          <li>• {t("profile.privacy.export.includes.orders")}</li>
          <li>• {t("profile.privacy.export.includes.downloads")}</li>
          <li>• {t("profile.privacy.export.includes.ai_history")}</li>
          <li>• {t("profile.privacy.export.includes.activity_log")}</li>
        </ul>
        {exportMsg && (
          <div
            role={exportMsg.kind === "error" ? "alert" : "status"}
            className={`mb-3 rounded-xl border-2 p-3 text-sm ${
              exportMsg.kind === "ok"
                ? "border-gum-mint bg-gum-mint/30 ink-default"
                : "border-red-500 bg-red-50 text-red-700"
            }`}
          >
            {exportMsg.text}
          </div>
        )}
        <button
          type="button"
          onClick={requestExport}
          disabled={exporting}
          className="gum-btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting ? t("profile.privacy.export.requesting") : t("profile.privacy.export.request")}
        </button>
      </SettingsCard>

      {/* Cookie consent */}
      <SettingsCard
        title={t("profile.privacy.cookies.title")}
        description={t("profile.privacy.cookies.subtitle")}
      >
        <ConsentRow
          label={t("profile.privacy.cookies.necessary")}
          description={t("profile.privacy.cookies.necessary_help")}
          checked
          disabled
          onChange={() => {}}
        />
        <ConsentRow
          label={t("profile.privacy.cookies.analytics")}
          description={t("profile.privacy.cookies.analytics_help")}
          checked={consent.analytics}
          onChange={(v) => updateConsent("analytics", v)}
        />
        <ConsentRow
          label={t("profile.privacy.cookies.marketing")}
          description={t("profile.privacy.cookies.marketing_help")}
          checked={consent.marketing}
          onChange={(v) => updateConsent("marketing", v)}
        />
      </SettingsCard>

      {/* CCPA sale opt-out */}
      <SettingsCard
        title={t("profile.privacy.sale.title")}
        description={t("profile.privacy.sale.subtitle")}
      >
        <div className="rounded-xl border-2 border-gum-mint bg-gum-mint/30 p-4">
          <p className="font-extrabold ink-default">
            {t("profile.privacy.sale.not_sold")}
          </p>
          <p className="mt-2 text-sm ink-muted">
            {t("profile.privacy.sale.not_sold_help")}
          </p>
        </div>
      </SettingsCard>

      {/* Legal links */}
      <SettingsCard title={t("profile.privacy.policies.title")}>
        <ul className="space-y-2 text-sm">
          <li>
            <a href="/privacy" className="text-gum-purple underline-offset-2 hover:underline">
              {t("footer.privacy_policy")}
            </a>
          </li>
          <li>
            <a href="/cookies" className="text-gum-purple underline-offset-2 hover:underline">
              {t("footer.cookie_policy")}
            </a>
          </li>
          <li>
            <a href="/terms" className="text-gum-purple underline-offset-2 hover:underline">
              {t("footer.terms")}
            </a>
          </li>
        </ul>
      </SettingsCard>
    </ProfileShell>
  );
}

function ConsentRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`mt-3 flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition first:mt-0 ${
        disabled
          ? "cursor-not-allowed border-gum-black/10 bg-gum-cream/50 opacity-70"
          : checked
            ? "border-gum-black bg-gum-yellow/30"
            : "border-gum-black/20 hover:border-gum-black hover:bg-gum-cream"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 flex-shrink-0 cursor-pointer accent-gum-purple"
      />
      <div className="flex-1">
        <p className="font-extrabold ink-default">{label}</p>
        <p className="mt-0.5 text-xs ink-muted">{description}</p>
      </div>
    </label>
  );
}