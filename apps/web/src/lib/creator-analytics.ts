// Creator analytics client. All endpoints under /creator/analytics.

import { api } from "./api";

export type AnalyticsRange = "7d" | "30d" | "90d" | "1y" | "all";

export interface CreatorOverviewTotals {
  revenueCents: number;
  orders: number;
  views: number;
  downloads: number;
  conversionRatePct: number;
}

export interface CreatorOverviewDaily {
  date: string; // YYYY-MM-DD
  revenueCents: number;
  orders: number;
}

export interface CreatorOverviewTopAsset {
  assetId: string;
  title: string;
  slug: string;
  priceCents: number;
  revenueCents: number;
  unitsSold: number;
}

export interface CreatorOverview {
  range: AnalyticsRange;
  totals: CreatorOverviewTotals;
  assetsByStatus: Record<string, number>;
  daily: CreatorOverviewDaily[];
  topAssets: CreatorOverviewTopAsset[];
}

export async function getCreatorOverview(
  range: AnalyticsRange,
  authToken: string
): Promise<CreatorOverview> {
  return api<CreatorOverview>(`/creator/analytics/overview?range=${range}`, {
    authToken,
  });
}

export interface CreatorAssetAnalytics {
  asset: {
    id: string;
    title: string;
    slug: string;
    priceCents: number;
    salesCount: number;
    avgRating: number | null;
    reviewCount: number;
    status: string;
    createdAt: string;
  };
  range: AnalyticsRange;
  totals: {
    revenueCents: number;
    orders: number;
    views: number;
    uniqueViewers: number;
    downloads: number;
    conversionRatePct: number;
    avgRating: number;
    reviewCount: number;
  };
  series: {
    dailyViews: Array<{ date: string; views: number; unique: number }>;
    dailyOrders: Array<{ date: string; orders: number; revenueCents: number }>;
  };
  reviews: Array<{ rating: number; createdAt: string }>;
}

export async function getCreatorAssetAnalytics(
  assetId: string,
  range: AnalyticsRange,
  authToken: string
): Promise<CreatorAssetAnalytics> {
  return api<CreatorAssetAnalytics>(
    `/creator/analytics/assets/${encodeURIComponent(assetId)}?range=${range}`,
    { authToken }
  );
}

export interface CreatorCohort {
  cohortWeek: string;
  size: number;
  retention: number[];
}

export async function getCreatorCohorts(
  authToken: string,
  weeks = 12
): Promise<{ cohorts: CreatorCohort[]; weeks: number }> {
  return api(`/creator/analytics/cohorts?weeks=${weeks}`, { authToken });
}

export interface CreatorCompare {
  range: AnalyticsRange;
  current: { revenueCents: number; orders: number; views: number; downloads: number };
  previous: { revenueCents: number; orders: number; views: number; downloads: number };
  delta: { revenueCents: number; orders: number; views: number; downloads: number };
}

export async function getCreatorCompare(
  range: AnalyticsRange,
  authToken: string
): Promise<CreatorCompare> {
  return api<CreatorCompare>(`/creator/analytics/compare?range=${range}`, { authToken });
}

export function analyticsCsvUrl(range: AnalyticsRange): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  return `${base}/creator/analytics/export.csv?range=${range}`;
}