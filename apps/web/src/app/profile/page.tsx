"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";
import { useAuth } from "@/lib/auth";
import { Avatar, avatarDataUrl } from "@/components/profile/Avatar";
import { ProfileShell, SectionHeader, SettingsCard } from "@/components/profile/ProfileShell";

/**
 * Profile overview page — `/profile`.
 *
 * Shows:
 *   1. The user's avatar + basic info
 *   2. Account stats (assets for creators, purchases for buyers)
 *   3. Quick links to sub-sections
 *   4. A live OG-image preview that uses the deterministic avatar
 */
export default function ProfilePage() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 ink-muted">
        {t("common.loading")}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-extrabold ink-default">
          {t("auth.sign_in_required")}
        </h1>
        <p className="mt-2 ink-muted">{t("auth.sign_in_to_view_profile")}</p>
        <Link
          href="/auth/login"
          className="mt-4 inline-block gum-btn-primary"
        >
          {t("nav.sign_in")}
        </Link>
      </div>
    );
  }

  const ogImageUrl = avatarDataUrl(user.displayName);
  const publicProfileUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/creator/${user.id}`;

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(publicProfileUrl);
      setCopied(true);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <ProfileShell user={user}>
      <SectionHeader
        title={t("profile.overview.title")}
        description={t("profile.overview.subtitle")}
      />

      {/* Avatar + public profile */}
      <SettingsCard
        title={t("profile.avatar.title")}
        description={t("profile.avatar.subtitle")}
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Avatar
            name={user.displayName}
            url={user.avatarUrl}
            size={96}
            ring
          />
          <div className="flex-1">
            <p className="text-lg font-extrabold ink-default">
              {user.displayName}
            </p>
            <p className="text-sm ink-muted">{user.email}</p>
            <p className="mt-2 text-xs ink-subtle">
              {user.isCreator ? t("profile.creator_badge") : t("profile.buyer_badge")}
            </p>
          </div>
          <Link
            href="/profile/account"
            className="gum-btn-secondary text-sm"
          >
            {t("profile.avatar.edit")}
          </Link>
        </div>

        {/* Public profile URL */}
        {user.isCreator && (
          <div className="mt-4 border-t border-gum-black/10 pt-4">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide ink-muted">
              {t("profile.public_profile")}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={publicProfileUrl}
                readOnly
                className="flex-1 rounded-xl border-2 border-gum-black bg-gum-cream px-3 py-2 text-sm ink-default"
                aria-label={t("profile.public_profile")}
              />
              <button
                type="button"
                onClick={copyProfileLink}
                className="rounded-xl border-2 border-gum-black bg-gum-yellow px-4 py-2 text-sm font-bold text-gum-black transition hover:brightness-95"
              >
                {copied ? t("common.copied") : t("common.copy")}
              </button>
            </div>
          </div>
        )}

        {/* OG image preview (for social shares) */}
        <div className="mt-4 border-t border-gum-black/10 pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide ink-muted">
            {t("profile.og_preview")}
          </p>
          <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-gum-black/30 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ogImageUrl} alt="" width={64} height={64} className="rounded-full" />
            <div>
              <p className="text-sm ink-default">{user.displayName}</p>
              <p className="text-xs ink-muted">elixiodigital.com</p>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Account stats */}
      <SettingsCard
        title={t("profile.stats.title")}
        description={t("profile.stats.subtitle")}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatBox
            label={t("profile.stats.member_since")}
            value={new Date(user.id ? "" : "").toLocaleDateString() || "—"}
          />
          <StatBox label={t("profile.stats.role")} value={user.isCreator ? t("profile.role.creator") : t("profile.role.buyer")} />
          <StatBox label={t("profile.stats.mfa")} value={user.mfaEnabled ? t("common.enabled") : t("common.disabled")} />
          <StatBox
            label={t("profile.stats.locale")}
            value={typeof navigator !== "undefined" ? navigator.language : "en"}
          />
        </div>
      </SettingsCard>

      {/* Quick links */}
      <SettingsCard
        title={t("profile.quick_links.title")}
        description={t("profile.quick_links.subtitle")}
      >
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <QuickLink
            href="/profile/security"
            title={t("profile.nav.security")}
            description={t("profile.quick_links.security_desc")}
          />
          <QuickLink
            href="/profile/privacy"
            title={t("profile.nav.privacy")}
            description={t("profile.quick_links.privacy_desc")}
          />
          <QuickLink
            href="/profile/notifications"
            title={t("profile.nav.notifications")}
            description={t("profile.quick_links.notifications_desc")}
          />
          <QuickLink
            href="/profile/account"
            title={t("profile.nav.account")}
            description={t("profile.quick_links.account_desc")}
          />
        </ul>
      </SettingsCard>
    </ProfileShell>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border-2 border-gum-black/20 bg-gum-cream p-3">
      <p className="text-xs font-bold uppercase tracking-wide ink-muted">{label}</p>
      <p className="mt-1 truncate text-base font-extrabold ink-default">{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-xl border-2 border-gum-black/20 p-3 transition hover:border-gum-black hover:bg-gum-cream"
      >
        <p className="font-extrabold ink-default">{title}</p>
        <p className="mt-1 text-xs ink-muted">{description}</p>
      </Link>
    </li>
  );
}