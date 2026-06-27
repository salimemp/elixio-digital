"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { GitHubIcon } from "@/components/icons/GitHubIcon";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { scorePassword, type PasswordStrength } from "@/lib/password";

type SignupType = "buyer" | "creator";

type Props = {
  signupType: SignupType;
};

export function SignupForm({ signupType }: Props) {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Server-side email-verification banner. The server sends the
  // verification email; we route the user to the prompt page so they
  // can re-send if they missed it.
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);

  // Live strength score (0-4) for the meter. Recomputed on every
  // keystroke — no debounce because the computation is sync and cheap.
  const strength: PasswordStrength = scorePassword(password);
  const [showPwned, setShowPwned] = useState(false);

  // Server-side HIBP check fires on a 500ms debounce so we're not
  // hitting the API on every keystroke. Only runs once the password
  // passes our local strength rules (length >= 8 with at least 3
  // character classes) — otherwise we'd pwned-check "a" repeatedly.
  useEffect(() => {
    if (strength === "very-weak" || !password) {
      setShowPwned(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { checkPwnedClient } = await import("@/lib/password");
        const result = await checkPwnedClient(password);
        setShowPwned(result.pwned);
      } catch {
        // Network failure — fail open, don't block the user.
        setShowPwned(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [password, strength]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (showPwned) {
      setError(
        "This password has appeared in known data breaches. Please choose a different one.",
      );
      return;
    }
    if (strength === "very-weak") {
      setError(
        "Your password must include at least 1 letter, 1 number, and 1 special character, and be 8+ characters long.",
      );
      return;
    }

    setLoading(true);
    try {
      const { api } = await import("@/lib/api");
      const res = await api<{ user: { id: string; email: string; displayName: string } }>(
        "/v1/auth/register",
        { method: "POST", body: { email, password, displayName, signupType } },
      );
      // The server sends a verification email immediately. We don't
      // sign in until they verify (server enforces this on protected
      // routes). For now, route them to the verify-prompt.
      setVerifyEmail(res.user.email);
      router.push(`/auth/verify-email-prompt?email=${encodeURIComponent(res.user.email)}`);
    } catch (err) {
      const msg = (err as Error).message || "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const typeLabel = signupType === "creator" ? "Creator" : "Buyer";
  const typeAccent = signupType === "creator" ? "bg-gum-yellow" : "bg-gum-cyan";

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-extrabold">
        Sign up as a{" "}
        <span
          className={`inline-block rounded-full border-2 border-gum-black ${typeAccent} px-3 py-1 align-middle`}
        >
          {typeLabel}
        </span>
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        {signupType === "creator"
          ? "Sell templates, design files, code, music, 3D — keep more of every sale. 5% platform fee, no monthly minimums."
          : "Discover and buy from thousands of independent creators. New drops every week."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => auth.beginOAuth("google")}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          <GoogleIcon className="h-4 w-4" />
          Google
        </button>
        <button
          type="button"
          onClick={() => auth.beginOAuth("github")}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          <GitHubIcon className="h-4 w-4" />
          GitHub
        </button>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-500">
        <div className="h-px flex-1 bg-gray-200" />
        or with email
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="displayName" className="mb-1 block text-sm font-semibold">
            Display name
          </label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={1}
            maxLength={60}
            autoComplete="name"
            placeholder="Ada Lovelace"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-describedby="password-rules"
          />
          <p
            id="password-rules"
            className="mt-2 text-xs text-gray-500"
          >
            Must include 1 letter, 1 number, and 1 special character.
          </p>
          <PasswordStrengthMeter
            strength={strength}
            pwned={showPwned}
            password={password}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border-2 border-gum-black bg-gum-pink px-3 py-2 text-sm font-semibold"
          >
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? "Creating account…"
            : signupType === "creator"
              ? "Create creator account"
              : "Create buyer account"}
        </Button>

        <p className="text-center text-xs text-gray-500">
          By signing up, you agree to our Terms and Privacy Policy. We&apos;ll
          send a verification email before you can sell or buy.
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-bold text-gum-purple underline">
          Sign in
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-gray-500">
        {signupType === "creator" ? (
          <>
            Just here to buy?{" "}
            <Link
              href="/auth/register/buyer"
              className="font-semibold text-gray-700 underline"
            >
              Switch to Buyer signup
            </Link>
          </>
        ) : (
          <>
            Want to sell?{" "}
            <Link
              href="/auth/register/creator"
              className="font-semibold text-gray-700 underline"
            >
              Switch to Creator signup
            </Link>
          </>
        )}
      </p>

      {verifyEmail && (
        <p className="mt-4 text-center text-xs text-gray-500">
          Verification email sent to {verifyEmail}
        </p>
      )}
    </main>
  );
}
