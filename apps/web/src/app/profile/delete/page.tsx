"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n-client";
import { useAuth } from "@/lib/auth";
import { ProfileShell, SectionHeader, SettingsCard } from "@/components/profile/ProfileShell";

/**
 * Account delete sub-page — the most destructive action in the app.
 *
 * UX:
 *   1. Plain-language warning about what gets deleted and what doesn't
 *   2. User types the literal string "DELETE" to confirm intent
 *   3. Password re-entry as second factor (only if password-authed)
 *   4. POST /v1/users/me/delete → soft-delete with 30-day grace, email
 *      confirmation of the deletion request.
 *   5. User is logged out + redirected to home with a banner.
 *
 * Soft-delete means:
 *   - Account is `deletedAt = now()` and `email = "deleted+<hash>@example.com"`
 *   - Personal data is anonymized in 30 days (background job, deferred to V1)
 *   - For now, anonymization runs synchronously on the API side; the 30-day
 *     grace means we don't run the irreversible step until then.
 */

export default function DeletePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 ink-muted">
        {t("auth.sign_in_to_view_profile")}
      </div>
    );
  }

  const confirmValid = confirmText === "DELETE";
  const canSubmit = confirmValid && password.length >= 1 && !submitting;

  const submit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const token = localStorage.getItem("elixio_access_token");
      const res = await fetch(`${apiUrl}/v1/users/me/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password, reason: reason || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
      }
      setMessage({ kind: "ok", text: t("profile.delete.requested") });
      // Sign out locally; redirect after 2s
      setTimeout(async () => {
        await signOut();
        router.push("/?deleted=1");
      }, 2000);
    } catch (e) {
      setMessage({
        kind: "error",
        text: e instanceof Error ? e.message : t("common.error"),
      });
      setSubmitting(false);
    }
  };

  return (
    <ProfileShell user={user}>
      <SectionHeader
        title={t("profile.delete.title")}
        description={t("profile.delete.subtitle")}
      />

      {/* Warning banner */}
      <div
        role="alert"
        className="mb-4 rounded-xl border-2 border-red-500 bg-red-50 p-4 text-sm text-red-800"
      >
        <p className="font-extrabold">{t("profile.delete.warning_title")}</p>
        <p className="mt-2">{t("profile.delete.warning_body")}</p>
      </div>

      {/* What gets deleted */}
      <SettingsCard title={t("profile.delete.what_gets_deleted")}>
        <ul className="space-y-2 text-sm ink-default">
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-red-600">✕</span>
            <span>{t("profile.delete.deletes.profile")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-red-600">✕</span>
            <span>{t("profile.delete.deletes.bio")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-red-600">✕</span>
            <span>{t("profile.delete.deletes.avatar")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-red-600">✕</span>
            <span>{t("profile.delete.deletes.mfa")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-red-600">✕</span>
            <span>{t("profile.delete.deletes.passkeys")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-red-600">✕</span>
            <span>{t("profile.delete.deletes.tokens")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-red-600">✕</span>
            <span>{t("profile.delete.deletes.notifications")}</span>
          </li>
        </ul>
      </SettingsCard>

      {/* What's preserved (anonymized, not deleted) */}
      <SettingsCard
        title={t("profile.delete.whats_preserved")}
        description={t("profile.delete.whats_preserved_help")}
      >
        <ul className="space-y-2 text-sm ink-default">
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-gum-mint">●</span>
            <span>{t("profile.delete.preserves.transactions")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-gum-mint">●</span>
            <span>{t("profile.delete.preserves.tax")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-gum-mint">●</span>
            <span>{t("profile.delete.preserves.abuse_records")}</span>
          </li>
        </ul>
        <p className="mt-3 text-xs ink-muted">
          {t("profile.delete.preserves_legal_basis")}
        </p>
      </SettingsCard>

      {/* Reason (optional) */}
      <SettingsCard
        title={t("profile.delete.reason_label")}
        description={t("profile.delete.reason_help")}
      >
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border-2 border-gum-black bg-gum-cream px-3 py-2 text-sm ink-default"
          placeholder={t("profile.delete.reason_placeholder")}
        />
      </SettingsCard>

      {/* Password confirm */}
      <SettingsCard
        title={t("profile.delete.password_confirm")}
        description={t("profile.delete.password_confirm_help")}
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full rounded-xl border-2 border-gum-black bg-gum-cream px-3 py-2 text-sm ink-default"
          placeholder={t("profile.delete.password_placeholder")}
        />
      </SettingsCard>

      {/* Type DELETE */}
      <SettingsCard
        title={t("profile.delete.type_delete")}
        description={t("profile.delete.type_delete_help")}
      >
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
          className={`w-full rounded-xl border-2 px-3 py-2 text-sm font-mono ink-default ${
            confirmValid
              ? "border-red-500 bg-red-50"
              : "border-gum-black bg-gum-cream"
          }`}
          placeholder="DELETE"
        />
        <p className="mt-1 text-xs ink-muted">
          {confirmValid
            ? t("profile.delete.type_delete_matched")
            : t("profile.delete.type_delete_not_matched")}
        </p>
      </SettingsCard>

      {/* Result message */}
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

      {/* Submit */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="gum-btn-secondary text-sm"
          disabled={submitting}
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-xl border-2 border-red-600 bg-red-600 px-5 py-2 text-sm font-extrabold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? t("common.deleting") : t("profile.delete.submit")}
        </button>
      </div>
    </ProfileShell>
  );
}