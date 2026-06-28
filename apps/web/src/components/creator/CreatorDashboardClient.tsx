"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import {
  getCreatorOverview,
  getCreatorAssetAnalytics,
  getCreatorCompare,
  getCreatorCohorts,
  analyticsCsvUrl,
  type AnalyticsRange,
  type CreatorOverview,
} from "@/lib/creator-analytics";

const RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "1y", "all"];

export function CreatorDashboardClient({
  initialOverview,
}: {
  initialOverview: CreatorOverview | null;
}) {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [overview, setOverview] = useState<CreatorOverview | null>(initialOverview);
  const [compare, setCompare] = useState<{
    current: { revenueCents: number; orders: number; views: number; downloads: number };
    previous: { revenueCents: number; orders: number; views: number; downloads: number };
    delta: { revenueCents: number; orders: number; views: number; downloads: number };
  } | null>(null);
  const [cohorts, setCohorts] = useState<{ cohorts: { cohortWeek: string; size: number; retention: number[] }[]; weeks: number } | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tok = getAccessToken();
    if (!tok) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getCreatorOverview(range, tok),
      range === "all" ? Promise.resolve(null) : getCreatorCompare(range, tok).catch(() => null),
      getCreatorCohorts(tok, 12).catch(() => null),
    ])
      .then(([ov, cmp, co]) => {
        setOverview(ov);
        setCompare(cmp);
        setCohorts(co);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [range]);

  // If an asset is selected, drill down
  useEffect(() => {
    if (!selectedAsset) return;
    const tok = getAccessToken();
    if (!tok) return;
    getCreatorAssetAnalytics(selectedAsset, range, tok)
      .then((d) => {
        // Open the asset detail in a modal (simple inline here)
        alert(
          `Asset: ${d.asset.title}\nRevenue: $${(d.totals.revenueCents / 100).toFixed(
            2
          )}\nOrders: ${d.totals.orders}\nViews: ${d.totals.views}\nConversion: ${d.totals.conversionRatePct}%\nAvg rating: ${d.totals.avgRating.toFixed(1)} (${d.totals.reviewCount} reviews)`
        );
        setSelectedAsset(null);
      })
      .catch((e) => setError((e as Error).message));
  }, [selectedAsset, range]);

  return (
    <div className="space-y-8">
      {/* Range selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border-2 border-gum-black bg-gum-cream p-1">
          {RANGES.map((r) => (
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
        <a
          href={analyticsCsvUrl(range)}
          className="gum-btn-secondary text-sm"
          download
        >
          Export CSV
        </a>
      </div>

      {error && (
        <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stat cards */}
      {overview && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Revenue"
            value={`$${(overview.totals.revenueCents / 100).toFixed(2)}`}
            color="purple"
            delta={compare?.delta.revenueCents}
          />
          <StatCard
            label="Orders"
            value={String(overview.totals.orders)}
            color="pink"
            delta={compare?.delta.orders}
          />
          <StatCard
            label="Views"
            value={String(overview.totals.views)}
            color="cyan"
            delta={compare?.delta.views}
          />
          <StatCard
            label="Conversion"
            value={`${overview.totals.conversionRatePct.toFixed(2)}%`}
            color="yellow"
          />
        </div>
      )}

      {/* Revenue chart */}
      {overview && (
        <div className="gum-card">
          <h3 className="mb-3 text-lg font-bold">Revenue</h3>
          <RevenueChart daily={overview.daily} />
        </div>
      )}

      {/* Top assets */}
      {overview && overview.topAssets.length > 0 && (
        <div className="gum-card">
          <h3 className="mb-3 text-lg font-bold">Top assets</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gum-black text-left">
                  <th className="py-2">Asset</th>
                  <th>Price</th>
                  <th>Units</th>
                  <th>Revenue</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {overview.topAssets.map((a) => (
                  <tr key={a.assetId} className="border-b border-gum-black/10">
                    <td className="py-2 font-bold">{a.title}</td>
                    <td>${(a.priceCents / 100).toFixed(2)}</td>
                    <td>{a.unitsSold}</td>
                    <td className="font-extrabold text-gum-purple">
                      ${(a.revenueCents / 100).toFixed(2)}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedAsset(a.assetId)}
                        className="rounded-full border-2 border-gum-black bg-gum-cream px-3 py-1 text-xs font-bold hover:bg-gum-cream"
                      >
                        Drill down
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cohort heatmap */}
      {cohorts && cohorts.cohorts.length > 0 && (
        <div className="gum-card">
          <h3 className="mb-3 text-lg font-bold">Cohort retention</h3>
          <p className="mb-3 text-sm ink-muted">
            % of buyers from each signup week still purchasing in subsequent weeks.
          </p>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="pr-2 text-left">Cohort</th>
                  <th className="px-1 text-right">Size</th>
                  {Array.from({ length: cohorts.weeks }).map((_, w) => (
                    <th key={w} className="px-1 text-right">
                      W{w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.cohorts.map((c) => (
                  <tr key={c.cohortWeek}>
                    <td className="pr-2 font-bold">{c.cohortWeek}</td>
                    <td className="px-1 text-right ink-muted">{c.size}</td>
                    {c.retention.map((r, w) => (
                      <td
                        key={w}
                        className="px-1 text-right"
                        style={{
                          backgroundColor: `rgba(124, 58, 237, ${Math.min(r / 100, 1)})`,
                          color: r > 50 ? "white" : "black",
                        }}
                      >
                        {r.toFixed(0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <a href="/sell" className="gum-card text-center hover:bg-gum-yellow">
          <h3 className="text-lg font-bold">Create asset</h3>
          <p className="mt-1 text-sm text-gum-black">Upload + list a new product.</p>
        </a>
        <a href="/dashboard/bulk" className="gum-card text-center hover:bg-gum-cyan">
          <h3 className="text-lg font-bold">Bulk operations</h3>
          <p className="mt-1 text-sm text-gum-black">Update prices, tags, or publish many assets at once.</p>
        </a>
        <a href="/studio" className="gum-card text-center hover:bg-gum-pink">
          <h3 className="text-lg font-bold">Studio</h3>
          <p className="mt-1 text-sm text-gum-black">AI tools — listing copywriter, asset critique, sales coach.</p>
        </a>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  delta,
}: {
  label: string;
  value: string;
  color: "purple" | "pink" | "cyan" | "yellow";
  delta?: number;
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
      <p className="text-xs font-bold uppercase tracking-wide ink-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
      {delta !== undefined && (
        <p
          className={`mt-1 text-xs font-bold ${
            delta > 0 ? "text-green-700" : delta < 0 ? "text-red-700" : "ink-muted"
          }`}
        >
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"}{" "}
          {delta === 0 ? "0%" : `${Math.abs(delta).toFixed(1)}%`} vs prev period
        </p>
      )}
    </div>
  );
}

function RevenueChart({ daily }: { daily: { date: string; revenueCents: number; orders: number }[] }) {
  if (daily.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border-2 border-dashed border-gum-black bg-gum-cream ink-muted">
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
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padT + plotH * (1 - pct);
        const v = Math.round((maxRevenue * pct) / 100);
        return (
          <g key={pct}>
            <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="#eee" strokeDasharray="2,2" />
            <text x={padL - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#666">
              ${v}
            </text>
          </g>
        );
      })}
      {daily.map((d, i) => {
        const x = padL + (i * plotW) / daily.length;
        const barH = (d.revenueCents / maxRevenue) * plotH;
        const y = padT + plotH - barH;
        return (
          <g key={d.date}>
            <title>
              {d.date}: ${(d.revenueCents / 100).toFixed(2)} ({d.orders} orders)
            </title>
            <rect x={x} y={y} width={barW} height={barH} fill="#7c3aed" rx={2} />
          </g>
        );
      })}
    </svg>
  );
}