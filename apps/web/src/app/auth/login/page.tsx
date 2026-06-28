"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { GitHubIcon } from "@/components/icons/GitHubIcon";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await auth.signIn(email, password);
      if (result.mfaRequired) {
        router.push("/auth/mfa-verify");
        return;
      }
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    setError(null);
    try {
      await auth.requestMagicLink(email);
      setMagicLinkSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handlePasskey() {
    setError(null);
    try {
      // The browser's WebAuthn API handles the rest.
      const { startAuthentication } = await import("@simplewebauthn/browser");
      await auth.startPasskeyLogin();
      const response = await startAuthentication({
        optionsJSON: undefined as never, // server already sent options via cookie
      }).catch(async () => {
        // Fallback: do the begin+finish in one shot
        const opts = await (await import("@/lib/api")).api<unknown>("/v1/auth/passkey/login/begin", { method: "POST" });
        return startAuthentication({ optionsJSON: opts as never });
      });
      const result = await auth.finishPasskeyLogin(response);
      if (result.mfaRequired) {
        router.push("/auth/mfa-verify");
        return;
      }
      router.push("/");
    } catch (err) {
      setError((err as Error).message ?? "Passkey login failed");
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-extrabold">Sign in</h1>
      <p className="mt-2 text-sm ink-muted">Welcome back. Sign in to your Elixio Digital account.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => auth.beginOAuth("google")}
          className="flex items-center justify-center gap-2 rounded-lg border border-gum-black/20 bg-gum-cream px-4 py-2.5 text-sm font-semibold text-gum-black hover:bg-gum-cream"
        >
          <GoogleIcon size={18} />
          Google
        </button>
        <button
          type="button"
          onClick={() => auth.beginOAuth("github")}
          className="flex items-center justify-center gap-2 rounded-lg border border-gum-black bg-gum-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gum-black/80"
        >
          <GitHubIcon size={18} className="text-white" />
          GitHub
        </button>
      </div>

      <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-wider ink-subtle">
        <hr className="flex-1" />
        or with email
        <hr className="flex-1" />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <label className="block text-sm">
          <span className="text-gum-black">Email</span>
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
          <span className="text-gum-black">Password</span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-4 flex flex-col gap-2 text-sm">
        <button
          type="button"
          onClick={handleMagicLink}
          disabled={!email}
          className="text-purple-700 underline disabled:opacity-50"
        >
          Email me a sign-in link instead
        </button>
        <button
          type="button"
          onClick={handlePasskey}
          className="text-purple-700 underline"
        >
          Use a passkey
        </button>
        {magicLinkSent && (
          <p className="text-sm text-green-700">Magic link sent. Check your inbox.</p>
        )}
        <Link href="/auth/forgot-password" className="ink-muted underline">
          Forgot your password?
        </Link>
        <p className="ink-muted">
          New here? <Link href="/auth/register" className="text-purple-700 underline">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
