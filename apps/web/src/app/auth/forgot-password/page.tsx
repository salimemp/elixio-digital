"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/v1/auth/password-reset/request", { method: "POST", body: { email } });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-extrabold">Forgot your password?</h1>
      <p className="mt-2 text-sm ink-muted">
        Enter your email and we&apos;ll send a link to choose a new password.
      </p>
      {sent ? (
        <p className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">
          If an account exists for <strong>{email}</strong>, a reset link has been sent.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <label className="block text-sm">
            <span className="ink-default">Email</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-sm">
        <Link href="/auth/login" className="text-purple-700 underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
