"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { GitHubIcon } from "@/components/icons/GitHubIcon";

export default function RegisterPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { api } = await import("@/lib/api");
      const res = await api<{ user: { id: string; email: string; displayName: string } }>(
        "/v1/auth/register",
        { method: "POST", body: { email, password, displayName } }
      );
      // Sign the user in immediately. They'll see a banner to verify their email.
      await auth.signIn(email, password);
      router.push(`/auth/verify-email-prompt?email=${encodeURIComponent(res.user.email)}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-extrabold">Create account</h1>
      <p className="mt-2 text-sm text-gray-600">Join Elixio Digital. Buy, sell, and showcase digital assets.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => auth.beginOAuth("google")}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          <GoogleIcon size={18} />
          Google
        </button>
        <button
          type="button"
          onClick={() => auth.beginOAuth("github")}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-900 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
        >
          <GitHubIcon size={18} className="text-white" />
          GitHub
        </button>
      </div>

      <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-wider text-gray-400">
        <hr className="flex-1" />
        or with email
        <hr className="flex-1" />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <label className="block text-sm">
          <span className="text-gray-700">Display name</span>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            required
            minLength={1}
            maxLength={120}
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-700">Email</span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            required
            autoComplete="email"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-700">Password (min 8 chars)</span>
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
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-purple-700 underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
