"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

function MagicLinkClient() {
  const router = useRouter();
  const params = useSearchParams();
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Invalid magic link.");
      return;
    }
    (async () => {
      try {
        const result = await auth.consumeMagicLink(token);
        router.replace(result.mfaRequired ? "/auth/mfa-verify" : "/");
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [params, auth, router]);

  return (
    <p className="text-sm ink-muted">
      {error ?? "Signing you in…"}
    </p>
  );
}

export default function MagicLinkPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-extrabold">Magic link sign-in</h1>
      <Suspense fallback={<p className="mt-4 text-sm ink-muted">Loading…</p>}>
        <MagicLinkClient />
      </Suspense>
    </main>
  );
}
