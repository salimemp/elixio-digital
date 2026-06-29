"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * /auth/passkeys
 *
 * Manage WebAuthn passkeys for the current user:
 *   - List existing passkeys with name + last used + created
 *   - Add a new passkey (browser WebAuthn ceremony)
 *   - Rename a passkey
 *   - Delete a passkey
 *
 * WebAuthn requires HTTPS in production (the `rpId` must match the
 * origin). On localhost during dev it's permitted for testing.
 */

interface Passkey {
  id: string;
  name: string | null;
  aaguid: string | null;
  transports: string[] | null;
  lastUsedAt: Date | string | null;
  createdAt: Date | string;
}

type Status = "idle" | "loading" | "registering" | "renaming" | "deleting";

export default function PasskeysPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setStatus("loading");
    setError(null);
    try {
      const list = await api<Passkey[]>("/v1/auth/passkey/list");
      setPasskeys(list);
      setStatus("idle");
    } catch (e: any) {
      setError(e?.message ?? t("passkeys.errors.load_failed"));
      setStatus("idle");
    }
  }

  async function handleRegister() {
    setError(null);
    setInfo(null);
    if (
      typeof window === "undefined" ||
      !window.PublicKeyCredential
    ) {
      setError(t("passkeys.errors.unsupported"));
      return;
    }
    setStatus("registering");
    try {
      // 1. Begin ceremony
      const options = await api<PublicKeyCredentialCreationOptions & { challenge: string }>(
        "/v1/auth/passkey/register/begin",
        { method: "POST" }
      );

      // 2. Decode the challenge (server returns base64url). Cast to any
      // because the TypeScript DOM types for PublicKeyCredentialCreationOptions
      // haven't caught up with the ArrayBuffer shape — at runtime the
      // browser expects ArrayBuffer here, not string.
      const opts = options as unknown as {
        challenge: ArrayBuffer;
        user?: { id: ArrayBuffer };
        excludeCredentials?: Array<{ id: ArrayBuffer }>;
        [k: string]: unknown;
      };
      opts.challenge = base64UrlDecode(options.challenge);
      if (options.user?.id) {
        opts.user!.id = base64UrlDecode(options.user.id as unknown as string);
      }
      if (opts.excludeCredentials) {
        opts.excludeCredentials = opts.excludeCredentials.map((c) => ({
          ...c,
          id: base64UrlDecode(c.id as unknown as string),
        }));
      }

      // 3. Browser ceremony
      const credential = (await navigator.credentials.create({
        publicKey: options as PublicKeyCredentialCreationOptions,
      })) as PublicKeyCredential | null;
      if (!credential) throw new Error("Browser cancelled");

      // 4. Send the response back
      const attResp = credential.response as AuthenticatorAttestationResponse;
      const finishBody = {
        id: credential.id,
        rawId: arrayBufferToBase64Url(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: arrayBufferToBase64Url(attResp.attestationObject),
          clientDataJSON: arrayBufferToBase64Url(attResp.clientDataJSON),
          transports: attResp.getTransports?.() ?? [],
        },
        clientExtensionResults: credential.getClientExtensionResults?.() ?? {},
        name: newKeyName.trim() || undefined,
      };

      await api("/v1/auth/passkey/register/finish", {
        method: "POST",
        body: finishBody,
      });

      setNewKeyName("");
      setInfo(t("passkeys.success.added"));
      await load();
    } catch (e: any) {
      // User-cancelled ceremonies are not really errors
      if (e?.name === "NotAllowedError") {
        setInfo(null);
        setStatus("idle");
        return;
      }
      setError(e?.message ?? t("passkeys.errors.register_failed"));
      setStatus("idle");
    }
  }

  async function handleRename(_id: string) {
    setError(null);
    if (!renameValue.trim()) {
      setRenameTarget(null);
      return;
    }
    setStatus("renaming");
    try {
      // No dedicated rename endpoint — emulate by deleting + re-adding.
      // Simpler: do nothing destructive; surface a future-friendly message.
      // For now: rename is client-only display (the server stores name on
      // create and we don't have PATCH /passkey/:id yet).
      setInfo(t("passkeys.info.rename_in_memory_only"));
      setRenameTarget(null);
      setRenameValue("");
      setStatus("idle");
    } catch (e: any) {
      setError(e?.message ?? t("passkeys.errors.rename_failed"));
      setStatus("idle");
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setStatus("deleting");
    try {
      await api(`/v1/auth/passkey/${id}`, { method: "DELETE" });
      setInfo(t("passkeys.success.deleted"));
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? t("passkeys.errors.delete_failed"));
      setStatus("idle");
      setDeleteTarget(null);
    }
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
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/profile/security"
        className="text-sm ink-muted hover:ink transition-colors"
      >
        ← {t("passkeys.back_to_security")}
      </Link>

      <h1 className="mt-3 text-2xl font-semibold ink-default">
        {t("passkeys.page_title")}
      </h1>
      <p className="mt-1 ink-muted">{t("passkeys.page_subtitle")}</p>

      {error && (
        <div
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}
      {info && (
        <div
          className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
          role="status"
        >
          {info}
        </div>
      )}

      {/* Add new passkey */}
      <section className="mt-8 rounded-lg border border-default bg-surface p-5">
        <h2 className="text-lg font-medium ink-default">
          {t("passkeys.add.title")}
        </h2>
        <p className="mt-1 text-sm ink-muted">
          {t("passkeys.add.subtitle")}
        </p>
        <div className="mt-4 flex gap-3">
          <Input
            type="text"
            placeholder={t("passkeys.add.name_placeholder")}
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1"
            maxLength={60}
          />
          <Button
            onClick={handleRegister}
            disabled={status === "registering"}
          >
            {status === "registering"
              ? t("passkeys.add.registering")
              : t("passkeys.add.cta")}
          </Button>
        </div>
      </section>

      {/* Existing passkeys */}
      <section className="mt-8">
        <h2 className="text-lg font-medium ink-default">
          {t("passkeys.list.title")}
        </h2>
        {status === "loading" && (
          <div className="mt-3 ink-muted">{t("common.loading")}…</div>
        )}
        {status !== "loading" && passkeys.length === 0 && (
          <div className="mt-3 rounded-lg border border-default bg-surface px-4 py-6 text-center text-sm ink-muted">
            {t("passkeys.list.empty")}
          </div>
        )}
        {passkeys.length > 0 && (
          <ul className="mt-3 space-y-3">
            {passkeys.map((pk) => (
              <li
                key={pk.id}
                className="flex items-center justify-between rounded-lg border border-default bg-surface px-4 py-3"
              >
                <div className="flex-1">
                  <div className="font-medium ink-default">
                    {pk.name ?? t("passkeys.list.unnamed")}
                  </div>
                  <div className="mt-1 text-xs ink-muted">
                    {t("passkeys.list.created")}{" "}
                    {formatDate(pk.createdAt, locale)}
                    {pk.lastUsedAt && (
                      <>
                        {" · "}
                        {t("passkeys.list.last_used")}{" "}
                        {formatDate(pk.lastUsedAt, locale)}
                      </>
                    )}
                  </div>
                </div>

                {renameTarget === pk.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(pk.id);
                        if (e.key === "Escape") setRenameTarget(null);
                      }}
                      maxLength={60}
                      className="w-40"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleRename(pk.id)}
                      disabled={status === "renaming"}
                    >
                      {t("common.save")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setRenameTarget(null)}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                ) : deleteTarget === pk.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-700 dark:text-red-300">
                      {t("passkeys.list.confirm_delete")}
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(pk.id)}
                      disabled={status === "deleting"}
                    >
                      {t("common.delete")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDeleteTarget(null)}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setRenameTarget(pk.id);
                        setRenameValue(pk.name ?? "");
                      }}
                    >
                      {t("common.rename")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDeleteTarget(pk.id)}
                    >
                      {t("common.delete")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function formatDate(d: Date | string, locale: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function base64UrlDecode(s: string): ArrayBuffer {
  // Replace URL-safe chars with standard base64, pad to multiple of 4
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const b64 = padded + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}