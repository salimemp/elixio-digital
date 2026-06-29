"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/profile/Avatar";
import { ProfileShell, SectionHeader, SettingsCard } from "@/components/profile/ProfileShell";

/**
 * Account settings sub-page. Edit display name, bio, avatar URL.
 * Email change is a separate flow (sends verification to the new address).
 */

interface UpdateProfileInput {
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
}

export default function AccountSettingsPage() {
  const { t } = useI18n();
  const { user, refresh } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 ink-muted">
        {t("auth.sign_in_to_view_profile")}
      </div>
    );
  }

  const dirty =
    displayName !== (user.displayName ?? "") ||
    bio !== (user.bio ?? "") ||
    (avatarUrl || "") !== (user.avatarUrl || "");

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const input: UpdateProfileInput = {};
      if (displayName !== user.displayName) input.displayName = displayName;
      if (bio !== (user.bio ?? "")) input.bio = bio || null;
      if ((avatarUrl || "") !== (user.avatarUrl || "")) input.avatarUrl = avatarUrl || null;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const token = typeof window !== "undefined" ? localStorage.getItem("elixio_access_token") : null;
      const res = await fetch(`${apiUrl}/v1/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
      }
      setMessage({ kind: "ok", text: t("profile.account.saved") });
      await refresh();
    } catch (e) {
      setMessage({
        kind: "error",
        text: e instanceof Error ? e.message : t("common.error"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileShell user={user}>
      <SectionHeader
        title={t("profile.account.title")}
        description={t("profile.account.subtitle")}
      />

      {/* Avatar preview */}
      <SettingsCard title={t("profile.avatar.title")}>
        <div className="flex items-center gap-4">
          <Avatar name={displayName} url={avatarUrl || null} size={72} ring />
          <div className="flex-1">
            <p className="text-xs ink-muted">
              {t("profile.avatar.help")}
            </p>
          </div>
        </div>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide ink-muted">
            {t("profile.avatar.url_label")}
          </span>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="w-full rounded-xl border-2 border-gum-black bg-gum-cream px-3 py-2 text-sm ink-default"
          />
        </label>
      </SettingsCard>

      {/* Display name */}
      <SettingsCard title={t("profile.account.display_name")}>
        <label className="block">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            minLength={1}
            maxLength={64}
            className="w-full rounded-xl border-2 border-gum-black bg-gum-cream px-3 py-2 text-sm ink-default"
          />
        </label>
      </SettingsCard>

      {/* Bio */}
      <SettingsCard
        title={t("profile.account.bio")}
        description={t("profile.account.bio_help")}
      >
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={500}
          className="w-full rounded-xl border-2 border-gum-black bg-gum-cream px-3 py-2 text-sm ink-default"
          placeholder={t("profile.account.bio_placeholder")}
        />
        <p className="mt-1 text-xs ink-subtle">
          {bio.length} / 500
        </p>
      </SettingsCard>

      {/* Email — read-only, change requires separate flow */}
      <SettingsCard
        title={t("profile.account.email")}
        description={t("profile.account.email_help")}
      >
        <div className="flex items-center gap-3">
          <input
            type="email"
            value={user.email}
            readOnly
            className="flex-1 rounded-xl border-2 border-gum-black/30 bg-gum-cream px-3 py-2 text-sm ink-muted"
          />
          <button
            type="button"
            disabled
            className="gum-btn-secondary cursor-not-allowed text-sm opacity-60"
            title={t("profile.account.email_change_soon")}
          >
            {t("common.change")}
          </button>
        </div>
      </SettingsCard>

      {/* Save */}
      {message && (
        <div
          role={message.kind === "error" ? "alert" : "status"}
          className={`mb-4 rounded-xl border-2 p-3 text-sm ${
            message.kind === "ok"
              ? "border-gum-mint bg-gum-mint/30 ink-default"
              : "border-red-500 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || !displayName.trim()}
          className="gum-btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </ProfileShell>
  );
}