import type { Metadata } from "next";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic"; // live data on every request

export const metadata: Metadata = {
  title: "Stats — Elixio in numbers",
  description:
    "Real-time stats from Elixio: creators, buyers, GMV, languages. We show the numbers, not just the marketing.",
  alternates: { canonical: "/stats" },
  openGraph: {
    title: "Elixio in numbers",
    description: "Real-time marketplace stats — creators, buyers, GMV, languages.",
    type: "website",
    url: "https://elixiodigital.com/stats",
  },
};

const formatUsd = (n: number): string => {
  if (n === 0) return "$0";
  if (n < 1) return `$${n.toFixed(2)}`;
  if (n < 1000) return `$${n.toFixed(2)}`;
  if (n < 1_000_000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${(n / 1_000_000).toFixed(2)}M`;
};

const formatInt = (n: number): string => n.toLocaleString("en-US");

const formatTimeAgo = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

type Stat = {
  label: string;
  value: string;
  hint?: string;
  accent: "pink" | "yellow" | "cyan" | "mint" | "purple";
};

const StatCard = ({ stat }: { stat: Stat }) => (
  <div className="gum-card">
    <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
      {stat.label}
    </p>
    <p className="mt-2 text-4xl font-extrabold tracking-tight text-gum-black">
      {stat.value}
    </p>
    {stat.hint && (
      <p className="mt-2 text-sm text-gray-500">{stat.hint}</p>
    )}
  </div>
);

const accent = (kind: Stat["accent"], text: string) => {
  const map: Record<Stat["accent"], string> = {
    pink: "bg-gum-pink",
    yellow: "bg-gum-yellow",
    cyan: "bg-gum-cyan",
    mint: "bg-gum-mint",
    purple: "bg-gum-purple text-white",
  };
  return `inline-block rounded-full border-2 border-gum-black ${map[kind]} px-3 py-1 text-xs font-bold uppercase tracking-wide`;
};

export default async function StatsPage() {
  const stats = await getStats();

  const userStats: Stat[] = [
    { label: "Total users", value: formatInt(stats.users.total), accent: "pink" },
    {
      label: "Creators",
      value: formatInt(stats.users.creators),
      hint: "Verified sellers on Elixio",
      accent: "yellow",
    },
    {
      label: "Email verified",
      value: formatInt(stats.users.verified),
      hint: `${stats.users.total ? Math.round((stats.users.verified / stats.users.total) * 100) : 0}% verification rate`,
      accent: "mint",
    },
    {
      label: "2FA enabled",
      value: formatInt(stats.users.withMfa),
      hint: "Passkey + TOTP users",
      accent: "cyan",
    },
  ];

  const contentStats: Stat[] = [
    {
      label: "Total assets",
      value: formatInt(stats.content.assets),
      hint: `${formatInt(stats.content.publishedAssets)} published`,
      accent: "pink",
    },
    {
      label: "Storefronts",
      value: formatInt(stats.content.storefronts),
      hint: "Branded creator pages",
      accent: "yellow",
    },
    {
      label: "Categories",
      value: formatInt(stats.content.categories),
      hint: "Browseable verticals",
      accent: "mint",
    },
    {
      label: "Languages at launch",
      value: formatInt(stats.languages),
      hint: "Localized end-to-end (i18n + l10n)",
      accent: "cyan",
    },
  ];

  const orderStats: Stat[] = [
    {
      label: "Total orders",
      value: formatInt(stats.orders.total),
      hint: "All-time",
      accent: "yellow",
    },
    {
      label: "Paid orders",
      value: formatInt(stats.orders.paid),
      hint: `${stats.orders.total ? Math.round((stats.orders.paid / stats.orders.total) * 100) : 0}% conversion`,
      accent: "mint",
    },
  ];

  const gmvStats: Stat[] = [
    {
      label: "GMV (all-time)",
      value: formatUsd(stats.gmv.grossUsd),
      hint: "Gross marketplace volume",
      accent: "purple",
    },
    {
      label: "Creator earnings",
      value: formatUsd(stats.gmv.creatorEarningsUsd),
      hint: "After platform fees",
      accent: "pink",
    },
    {
      label: "Platform fees",
      value: formatUsd(stats.gmv.platformFeesUsd),
      hint: "5% Elixio fee",
      accent: "cyan",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-12">
        <span className={accent("yellow", "Live")}>● LIVE</span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight md:text-7xl">
          Elixio in{" "}
          <span className="text-gum-purple">numbers</span>
        </h1>
        <p className="mt-4 max-w-2xl text-xl text-gray-700">
          We show the numbers, not just the marketing. Updated every 60 seconds
          from our production database.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Last updated {formatTimeAgo(stats.generatedAt)}
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-extrabold">People</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {userStats.map((s) => (
            <StatCard key={s.label} stat={s} />
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-extrabold">Content</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contentStats.map((s) => (
            <StatCard key={s.label} stat={s} />
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-extrabold">Commerce</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {orderStats.map((s) => (
            <StatCard key={s.label} stat={s} />
          ))}
          {gmvStats.map((s) => (
            <StatCard key={s.label} stat={s} />
          ))}
        </div>
      </section>

      <footer className="mt-16 border-t-2 border-gum-black pt-8">
        <div className="gum-card">
          <h2 className="text-2xl font-extrabold">Why we share this</h2>
          <p className="mt-2 text-gray-700">
            Every other marketplace hides its numbers. We don&apos;t. If
            you&apos;re a creator thinking about switching, you should be able
            to see exactly what kind of growth we&apos;re getting — and judge
            for yourself whether it&apos;s worth it.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Source: <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
              GET https://api.elixiodigital.com/stats
            </code>{" "}
            — open API, no auth.
          </p>
        </div>
      </footer>
    </main>
  );
}
