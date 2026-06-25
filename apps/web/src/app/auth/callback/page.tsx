"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const code = params.get("code");
    const error = params.get("error");
    if (error) {
      router.replace(`/auth/login?error=${encodeURIComponent(error)}`);
      return;
    }
    if (!code) {
      router.replace("/auth/login?error=missing_code");
      return;
    }
    (async () => {
      try {
        const res = await api<{ user: { id: string; email: string; displayName: string }; tokens: { accessToken: string; refreshToken: string; expiresIn: number } }>(
          "/v1/auth/oauth/exchange",
          { method: "POST", body: { code } }
        );
        localStorage.setItem(
          "elixio.auth",
          JSON.stringify({ accessToken: res.tokens.accessToken, refreshToken: res.tokens.refreshToken })
        );
        router.replace("/");
      } catch (err) {
        router.replace(`/auth/login?error=${encodeURIComponent((err as Error).message)}`);
      }
    })();
  }, [params, router]);

  return <p className="text-sm text-gray-600">Finishing sign-in…</p>;
}

export default function OAuthCallbackPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-12 text-center">
      <Suspense fallback={<p className="text-sm text-gray-600">Loading…</p>}>
        <CallbackClient />
      </Suspense>
    </main>
  );
}
