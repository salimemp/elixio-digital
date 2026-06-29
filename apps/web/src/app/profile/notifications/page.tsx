"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { useAuth } from "@/lib/auth";
import { ProfileShell, SectionHeader, SettingsCard } from "@/components/profile/ProfileShell";

/**
 * Notification preferences sub-page. Per-channel + per-topic toggles.
 *
 * Toggles are persisted client-side first (optimistic) and synced to the
 * server when the backend adds the endpoint. For now, localStorage only.
 */
export default function NotificationsPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  // Initial prefs from localStorage (default = all on)
  const initial =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("elixio_notification_prefs") || "{}")
      : {};
  const [prefs, setPrefs] = useState({
    email_marketing: initial.email_marketing ?? true,
    email_product: initial.email_product ?? true,
    email_security: initial.email_security ?? true,
    email_orders: initial.email_orders ?? true,
    email_creator: initial.email_creator ?? true,
    push_enabled: initial.push_enabled ?? false,
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 ink-muted">
        {t("auth.sign_in_to_view_profile")}
      </div>
    );
  }

  const update = (key: keyof typeof prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      localStorage.setItem("elixio_notification_prefs", JSON.stringify(next));
    } catch {
      /* localStorage unavailable */
    }
  };

  return (
    <ProfileShell user={user}>
      <SectionHeader
        title={t("profile.notifications.title")}
        description={t("profile.notifications.subtitle")}
      />

      <SettingsCard title={t("profile.notifications.email.title")}>
        <div className="space-y-3">
          <Toggle
            label={t("profile.notifications.email.orders")}
            description={t("profile.notifications.email.orders_help")}
            checked={prefs.email_orders}
            disabled
            onChange={() => {}}
          />
          <Toggle
            label={t("profile.notifications.email.security")}
            description={t("profile.notifications.email.security_help")}
            checked={prefs.email_security}
            disabled
            onChange={() => {}}
          />
          <Toggle
            label={t("profile.notifications.email.product")}
            description={t("profile.notifications.email.product_help")}
            checked={prefs.email_product}
            onChange={(v) => update("email_product", v)}
          />
          <Toggle
            label={t("profile.notifications.email.marketing")}
            description={t("profile.notifications.email.marketing_help")}
            checked={prefs.email_marketing}
            onChange={(v) => update("email_marketing", v)}
          />
          {user.isCreator && (
            <Toggle
              label={t("profile.notifications.email.creator")}
              description={t("profile.notifications.email.creator_help")}
              checked={prefs.email_creator}
              onChange={(v) => update("email_creator", v)}
            />
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("profile.notifications.push.title")}
        description={t("profile.notifications.push.subtitle")}
      >
        <div className="rounded-xl border-2 border-gum-black/20 bg-gum-cream p-4 text-sm ink-muted">
          <p className="font-extrabold ink-default">
            {t("profile.notifications.push.mobile_only")}
          </p>
          <p className="mt-2">
            {t("profile.notifications.push.mobile_only_help")}
          </p>
        </div>
      </SettingsCard>
    </ProfileShell>
  );
}

function Toggle({
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
      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${
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
        {disabled && (
          <p className="mt-1 text-xs ink-subtle">
            (always on — required for your account safety)
          </p>
        )}
      </div>
    </label>
  );
}