"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import {
  getCreatorOverview,
  type AnalyticsRange,
  type CreatorOverview,
} from "@/lib/creator-analytics";

/**
 * Revenue-over-time bar chart for the dashboard overview. Pure SVG
 * so we don't add a chart-library dependency. Y-axis is revenue in
 * dollars (rounded), X-axis is dates.
 */
export function RevenueChart({ daily }: { daily: CreatorOverview["daily"] }) {
  if (daily.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border-2 border-dashed border-gum-black bg-white text-gray-500">
        No revenue in this period yet — your first sale will appear here.
      </div>
    );
  }

  const maxRevenue = Math.max(...daily.map((d) => d.revenueCents), 1);
  const w = 600;
  const h = 200;
  const padL = 50;
  const padB = 30;
  const padT = 10;
  const padR = 10;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const barW = Math.max(2, plotW / daily.length - 2);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padT + plotH * (1 - pct);
        const v = Math.round((maxRevenue * pct) / 100);
        return (
          <g key={pct}>
            <line
              x1={padL}
              x2={w - padR}
              y1={y}
              y2={y}
              stroke="#eee"
              strokeDasharray="2,2"
            />
            <text x={padL - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#666">
              ${v}
            </text>
          </g>
        );
      })}
      {/* Bars */}
      {daily.map((d, i) => {
        const x = padL + (i * plotW) / daily.length;
        const barH = (d.revenueCents / maxRevenue) * plotH;
        const y = padT + plotH - barH;
        return (
          <g key={d.date}>
            <title>
              {d.date}: ${(d.revenueCents / 100).toFixed(2)} ({d.orders} orders)
            </title>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill="#7c3aed"
              rx={2}
            />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Top-of-page overview panel: 4 stat cards + range selector + chart.
 * Loads data client-side because the creator JWT lives in localStorage.
 */
export function CreatorOverviewPanel({
  initial,
}: {
  initial?: CreatorOverview;
}) {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [data, setData] = useState<CreatorOverview | null>(initial ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial && initial.range === range) return;
    const tok = getAccessToken();
    if (!tok) return;
    setLoading(true);
    setError(null);
    getCreatorOverview(range, tok)
      .then(setData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [range, initial]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold">Overview</h2>
        <div className="flex gap-1 rounded-full border-2 border-gum-black bg-white p-1">
          {(["7d", "30d", "90d", "1y", "all"] as AnalyticsRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 text-sm font-bold transition ${
                range === r
                  ? "bg-gum-black text-white"
                  : "text-gum-black hover:bg-gum-cream"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border-2 border-red-500 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="gum-card animate-pulse">
              <div className="h-4 w-20 rounded bg-gray-200" />
              <div className="mt-3 h-8 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Revenue"
              value={`$${(data.totals.revenueCents / 100).toFixed(2)}`}
              color="purple"
            />
            <StatCard label="Orders" value={String(data.totals.orders)} color="pink" />
            <StatCard label="Views" value={String(data.totals.views)} color="cyan" />
            <StatCard
              label="Conversion"
              value={`${data.totals.conversionRatePct.toFixed(2)}%`}
              color="yellow"
            />
          </div>

          <div className="mt-6 gum-card">
            <h3 className="mb-3 text-lg font-bold">Revenue</h3>
            <RevenueChart daily={data.daily} />
          </div>
        </>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "purple" | "pink" | "cyan" | "yellow";
}) {
  const colors = {
    purple: "bg-gum-purple",
    pink: "bg-gum-pink",
    cyan: "bg-gum-cyan",
    yellow: "bg-gum-yellow",
  };
  return (
    <div className="gum-card relative overflow-hidden">
      <span
        className={`absolute right-2 top-2 h-3 w-3 rounded-full ${colors[color]}`}
      />
      <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
        {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}