"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function MfaVerifyPage() {
  const router = useRouter();
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // The mfaToken is currently a future flow; for MVP we ask the user
      // to provide a code which we POST to /mfa/verify along with the
      // mfaToken (when MFA is fully wired, the mfaToken is returned by login).
      const stored = JSON.parse(localStorage.getItem("elixio.auth.mfa") ?? "{}");
      if (!stored.mfaToken) {
        setError("No pending MFA challenge. Please sign in again.");
        return;
      }
      await api("/v1/auth/mfa/verify", {
        method: "POST",
        body: { mfaToken: stored.mfaToken, code },
      });
      // Now full session — clear the pending state.
      localStorage.removeItem("elixio.auth.mfa");
      await auth.refresh();
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-extrabold">Two-factor code</h1>
      <p className="mt-2 text-sm text-gray-600">
        Open your authenticator app and enter the 6-digit code, or one of your backup codes.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <label className="block text-sm">
          <span className="text-gray-700">Code</span>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            required
            minLength={4}
            maxLength={20}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Verifying…" : "Verify"}
        </Button>
      </form>
    </main>
  );
}
