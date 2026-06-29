"use client";

import { useI18n } from "@/lib/i18n-client";
import { useAuth } from "@/lib/auth";
import { ProfileShell, SectionHeader, SettingsCard } from "@/components/profile/ProfileShell";
import Link from "next/link";

/**
 * Security settings sub-page. Status of MFA, password, OAuth accounts,
 * active sessions. Detailed management lives on dedicated sub-pages
 * (mfa-setup, sessions, etc.) — those are linked out.
 */

export default function SecurityPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 ink-muted">
        {t("auth.sign_in_to_view_profile")}
      </div>
    );
  }

  return (
    <ProfileShell user={user}>
      <SectionHeader
        title={t("profile.security.title")}
        description={t("profile.security.subtitle")}
      />

      <SettingsCard
        title={t("profile.security.password.title")}
        description={t("profile.security.password.subtitle")}
      >
        <Link href="/auth/reset-password" className="gum-btn-primary text-sm">
          {t("profile.security.password.change")}
        </Link>
      </SettingsCard>

      <SettingsCard
        title={t("profile.security.mfa.title")}
        description={t("profile.security.mfa.subtitle")}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-extrabold ink-default">
              {user.mfaEnabled ? t("common.enabled") : t("common.disabled")}
            </p>
            <p className="mt-1 text-xs ink-muted">
              {user.mfaEnabled
                ? t("profile.security.mfa.enabled_help")
                : t("profile.security.mfa.disabled_help")}
            </p>
          </div>
          <Link
            href="/auth/mfa-setup"
            className="gum-btn-secondary text-sm"
          >
            {user.mfaEnabled ? t("common.manage") : t("common.enable")}
          </Link>
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("profile.security.passkeys.title")}
        description={t("profile.security.passkeys.subtitle")}
      >
        <Link
          href="/auth/passkeys"
          className="gum-btn-secondary text-sm"
        >
          {t("common.manage")}
        </Link>
      </SettingsCard>

      <SettingsCard
        title={t("profile.security.oauth.title")}
        description={t("profile.security.oauth.subtitle")}
      >
        <div className="flex gap-2">
          <a
            href={`${apiUrl}/auth/oauth/google/begin`}
            className="gum-btn-secondary text-sm"
          >
            Google
          </a>
          <a
            href={`${apiUrl}/auth/oauth/github/begin`}
            className="gum-btn-secondary text-sm"
          >
            GitHub
          </a>
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("profile.security.sessions.title")}
        description={t("profile.security.sessions.subtitle")}
      >
        <Link
          href="/profile/security/sessions"
          className="gum-btn-secondary text-sm"
        >
          {t("common.manage")}
        </Link>
      </SettingsCard>

      <SettingsCard
        title={t("profile.security.activity.title")}
        description={t("profile.security.activity.subtitle")}
      >
        <Link
          href="/profile/security/activity"
          className="gum-btn-secondary text-sm"
        >
          {t("common.view")}
        </Link>
      </SettingsCard>
    </ProfileShell>
  );
}