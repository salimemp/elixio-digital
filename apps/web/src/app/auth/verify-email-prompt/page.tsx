"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

function VerifyEmailPromptClient() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setLoading(true);
    setError(null);
    try {
      const { api } = await import("@/lib/api");
      const stored = JSON.parse(localStorage.getItem("elixio.auth") ?? "{}");
      await api("/v1/auth/verify-email/request", {
        method: "POST",
        authToken: stored.accessToken,
      });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="mt-2 text-sm ink-muted">
        We sent a verification link to <strong>{email}</strong>. Click the link in that email to finish setting up your account.
      </p>
      {sent && <p className="mt-4 text-sm text-green-700">Verification email re-sent.</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-6">
        <Button onClick={resend} disabled={loading}>
          {loading ? "Sending…" : "Resend verification email"}
        </Button>
      </div>
      <p className="mt-6 text-xs ink-muted">
        You can browse Elixio Digital without verifying, but you won&apos;t be able to publish or purchase until you do.
      </p>
    </>
  );
}

export default function VerifyEmailPromptPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-extrabold">Verify your email</h1>
      <Suspense fallback={<p className="mt-4 text-sm ink-muted">Loading…</p>}>
        <VerifyEmailPromptClient />
      </Suspense>
    </main>
  );
}
