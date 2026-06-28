"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/v1/auth/password-reset/confirm", { method: "POST", body: { token, newPassword: password } });
      router.push("/auth/login?reset=ok");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return <p className="text-sm text-red-600">Invalid reset link.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <label className="block text-sm">
        <span className="text-gum-black">New password (min 8 chars)</span>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-extrabold">Choose a new password</h1>
      <Suspense fallback={<p className="text-sm ink-muted">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
