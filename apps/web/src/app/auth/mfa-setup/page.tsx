"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * /auth/mfa-setup
 *
 * 3-step TOTP enrollment:
 *   1. Start: POST /v1/auth/mfa/totp/setup → returns QR + secret
 *   2. Verify: user enters 6-digit code from authenticator app,
 *              POST /v1/auth/mfa/totp/confirm → enables MFA
 *   3. Backup codes: shown once, user must save them
 *
 * If MFA is already enabled, the page shows the current status +
 * a disable flow (POST /v1/auth/mfa/disable).
 */

type Phase = "loading" | "start" | "verify" | "backup" | "active" | "disabled";

interface TotpSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export default function MfaSetupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, refresh } = useAuth();

  const [phase, setPhase] = useState<Phase>("loading");
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  // Detect current MFA state on mount.
  useEffect(() => {
    if (!user) return;
    setPhase(user.mfaEnabled ? "active" : "start");
  }, [user]);

  async function handleStart() {
    setError(null);
    setBusy(true);
    try {
      const result = await api<TotpSetup>("/v1/auth/mfa/totp/setup", {
        method: "POST",
      });
      setSetup(result);
      setPhase("verify");
    } catch (e: any) {
      setError(e?.message ?? t("mfa.errors.setup_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (code.length < 6) {
      setError(t("mfa.errors.code_required"));
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ backupCodes: string[] }>(
        "/v1/auth/mfa/totp/confirm",
        { method: "POST", body: { code } }
      );
      setBackupCodes(result.backupCodes);
      setPhase("backup");
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? t("mfa.errors.verify_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setError(null);
    setBusy(true);
    try {
      await api("/v1/auth/mfa/disable", { method: "POST" });
      setPhase("disabled");
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? t("mfa.errors.disable_failed"));
    } finally {
      setBusy(false);
      setShowDisableConfirm(false);
    }
  }

  function copyBackupCodes() {
    if (backupCodes.length === 0) return;
    navigator.clipboard.writeText(backupCodes.join("\n")).catch(() => {
      /* ignore — non-critical */
    });
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 ink-muted">
        <Link href="/auth/login" className="link">
          {t("auth.sign_in_required")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link
        href="/profile/security"
        className="text-sm ink-muted hover:ink transition-colors"
      >
        ← {t("mfa.back_to_security")}
      </Link>

      <h1 className="mt-3 text-2xl font-semibold ink-default">
        {t("mfa.page_title")}
      </h1>
      <p className="mt-1 ink-muted">{t("mfa.page_subtitle")}</p>

      {error && (
        <div
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {phase === "loading" && (
        <div className="mt-8 ink-muted">{t("common.loading")}…</div>
      )}

      {phase === "start" && (
        <div className="mt-8 space-y-6">
          <p className="text-sm ink-default">
            {t("mfa.start.body")}
          </p>
          <Button onClick={handleStart} disabled={busy} className="w-full">
            {busy ? t("common.loading") : t("mfa.start.cta")}
          </Button>
        </div>
      )}

      {phase === "verify" && setup && (
        <form onSubmit={handleVerify} className="mt-8 space-y-6">
          <div>
            <p className="text-sm ink-default">
              {t("mfa.verify.scan_instruction")}
            </p>
            <div className="mt-4 flex justify-center rounded-lg border border-default bg-surface p-4">
              {/* QR code is a data URL PNG returned by the server */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={setup.qrCodeDataUrl}
                alt={t("mfa.verify.qr_alt")}
                width={200}
                height={200}
                className="h-48 w-48"
              />
            </div>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer ink-muted hover:ink-default">
              {t("mfa.verify.manual_entry_toggle")}
            </summary>
            <div className="mt-2 rounded bg-surface px-3 py-2 font-mono text-xs break-all">
              {setup.secret}
            </div>
          </details>

          <div>
            <label
              htmlFor="mfa-code"
              className="block text-sm font-medium ink-default"
            >
              {t("mfa.verify.code_label")}
            </label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
              }
              className="mt-1 text-center text-lg tracking-widest"
              placeholder="000000"
            />
          </div>

          <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
            {busy ? t("common.loading") : t("mfa.verify.cta")}
          </Button>
        </form>
      )}

      {phase === "backup" && (
        <div className="mt-8 space-y-6">
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
            ✓ {t("mfa.backup.success_notice")}
          </div>

          <div>
            <p className="text-sm font-medium ink-default">
              {t("mfa.backup.title")}
            </p>
            <p className="mt-1 text-sm ink-muted">
              {t("mfa.backup.instruction")}
            </p>
          </div>

          <div className="rounded-lg border border-default bg-surface p-4">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((c) => (
                <div key={c} className="select-all">
                  {c}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={copyBackupCodes} variant="secondary" className="flex-1">
              {t("mfa.backup.copy")}
            </Button>
            <Button
              onClick={() => router.push("/profile/security")}
              className="flex-1"
            >
              {t("mfa.backup.done")}
            </Button>
          </div>
        </div>
      )}

      {phase === "active" && (
        <div className="mt-8 space-y-6">
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
            ✓ {t("mfa.active.enabled_notice")}
          </div>

          <p className="text-sm ink-default">{t("mfa.active.body")}</p>

          {!showDisableConfirm ? (
            <Button
              onClick={() => setShowDisableConfirm(true)}
              variant="secondary"
              className="w-full"
            >
              {t("mfa.active.disable_cta")}
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
              <p className="text-sm text-red-700 dark:text-red-200">
                {t("mfa.active.disable_confirm")}
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowDisableConfirm(false)}
                  variant="secondary"
                  className="flex-1"
                  disabled={busy}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleDisable}
                  variant="danger"
                  className="flex-1"
                  disabled={busy}
                >
                  {busy ? t("common.loading") : t("mfa.active.disable_confirm_cta")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "disabled" && (
        <div className="mt-8 space-y-6">
          <div className="rounded-lg border border-default bg-surface px-4 py-3 text-sm ink-default">
            {t("mfa.disabled.notice")}
          </div>
          <Button onClick={() => setPhase("start")} className="w-full">
            {t("mfa.disabled.re_enable_cta")}
          </Button>
        </div>
      )}
    </div>
  );
}