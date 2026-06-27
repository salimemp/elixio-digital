import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up — Elixio",
  description: "Join Elixio Digital as a buyer or a creator.",
  alternates: { canonical: "/auth/register" },
};

export default function RegisterChooserPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
        Join Elixio
      </h1>
      <p className="mt-2 text-lg text-gray-600">
        Are you here to discover creators, or to sell your own work?
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Link
          href="/auth/register/buyer"
          className="gum-card block transition-transform hover:-translate-y-1 hover:shadow-[0_8px_0_0_#111]"
        >
          <span className="inline-block rounded-full border-2 border-gum-black bg-gum-cyan px-3 py-1 text-xs font-bold uppercase tracking-wide">
            For Buyers
          </span>
          <h2 className="mt-4 text-2xl font-extrabold">I want to buy digital work</h2>
          <p className="mt-2 text-gray-700">
            Discover, preview, and buy from thousands of independent
            creators. New drops every week across templates, design files,
            code, music, 3D, and more.
          </p>
          <ul className="mt-4 space-y-1 text-sm text-gray-600">
            <li>· Secure checkout, instant download</li>
            <li>· 25+ languages, voice search</li>
            <li>· E2E-encrypted delivery</li>
            <li>· No subscription required</li>
          </ul>
          <p className="mt-6 text-sm font-bold text-gum-purple underline">
            Sign up as a buyer →
          </p>
        </Link>

        <Link
          href="/auth/register/creator"
          className="gum-card block transition-transform hover:-translate-y-1 hover:shadow-[0_8px_0_0_#111]"
        >
          <span className="inline-block rounded-full border-2 border-gum-black bg-gum-yellow px-3 py-1 text-xs font-bold uppercase tracking-wide">
            For Creators
          </span>
          <h2 className="mt-4 text-2xl font-extrabold">I want to sell my work</h2>
          <p className="mt-2 text-gray-700">
            Keep more of every sale. 5% platform fee, no monthly minimums,
            no listing fees. Set up your storefront in under 5 minutes.
          </p>
          <ul className="mt-4 space-y-1 text-sm text-gray-600">
            <li>· Branded storefront + custom domain</li>
            <li>· Subscriptions, bundles, pay-what-you-want</li>
            <li>· Stripe + Razorpay payouts</li>
            <li>· Cross-platform: web, iOS, Android, desktop</li>
          </ul>
          <p className="mt-6 text-sm font-bold text-gum-purple underline">
            Sign up as a creator →
          </p>
        </Link>
      </div>

      <p className="mt-8 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-bold text-gum-purple underline"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
