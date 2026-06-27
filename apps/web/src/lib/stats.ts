/**
 * Fetches the public stats from the Elixio API.
 *
 * The API is at `ELIXIO_API_URL` (e.g. https://api.elixiodigital.com).
 * The /stats endpoint is unauthenticated, public, and cached for 60s.
 *
 * On the Vercel edge this is hit at request time (dynamic = "force-dynamic"
 * on the page). The API response is also CDN-cached, so the DB is hit at
 * most once per minute per edge region.
 */

export type ElixioStats = {
  generatedAt: string;
  users: {
    total: number;
    creators: number;
    verified: number;
    withMfa: number;
  };
  content: {
    assets: number;
    publishedAssets: number;
    storefronts: number;
    categories: number;
  };
  orders: {
    total: number;
    paid: number;
  };
  gmv: {
    grossUsd: number;
    creatorEarningsUsd: number;
    platformFeesUsd: number;
    currency: string;
  };
  languages: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.elixiodigital.com";

export const getStats = async (): Promise<ElixioStats> => {
  const url = `${API_URL.replace(/\/$/, "")}/stats`;
  const res = await fetch(url, {
    // Always fetch fresh — the API itself caches the response for 60s
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    // Fallback: render zeros so the page still works during API downtime
    // (Vercel + Railway occasionally have brief network blips)
    return {
      generatedAt: new Date().toISOString(),
      users: { total: 0, creators: 0, verified: 0, withMfa: 0 },
      content: { assets: 0, publishedAssets: 0, storefronts: 0, categories: 0 },
      orders: { total: 0, paid: 0 },
      gmv: { grossUsd: 0, creatorEarningsUsd: 0, platformFeesUsd: 0, currency: "USD" },
      languages: 25,
    };
  }

  return res.json();
};
