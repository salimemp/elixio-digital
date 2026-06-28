"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function VerifyEmailClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Invalid verification link.");
      return;
    }
    (async () => {
      try {
        await api("/v1/auth/verify-email", { method: "POST", body: { token } });
        router.replace("/?verified=ok");
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [params, router]);

  return (
    <p className="text-sm ink-muted">
      {error ?? "Verifying your email…"}
    </p>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-extrabold">Verifying email</h1>
      <Suspense fallback={<p className="mt-4 text-sm ink-muted">Loading…</p>}>
        <VerifyEmailClient />
      </Suspense>
    </main>
  );
}
