import { prisma } from "../lib/prisma.js";

export type AnalyticsRange = "7d" | "30d" | "90d" | "1y" | "all";

const RANGE_DAYS: Record<AnalyticsRange, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
  all: null,
};

/**
 * Build the start date for a given range. "all" returns null (no lower bound).
 */
function startDateFor(range: AnalyticsRange): Date | null {
  const days = RANGE_DAYS[range];
  if (days === null) return null;
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/**
 * Top-level dashboard rollup for a creator. Powers the /dashboard
 * overview cards + the main revenue chart.
 *
 * Note: OrderItem doesn't have its own createdAt — we use the parent
 * Order's createdAt via the join. priceCents IS the creator's earnings
 * (no platform fee on the item itself; platform fee is on the Order).
 */
export async function getCreatorOverview(
  creatorId: string,
  range: AnalyticsRange
) {
  const start = startDateFor(range);

  const [orderItems, assetAgg, viewAgg, downloadAgg, topAssets] = await Promise.all([
    // All paid order items for this creator in range — for revenue + counts
    prisma.orderItem.findMany({
      where: {
        asset: { creatorId },
        order: { status: "paid", ...(start ? { createdAt: { gte: start } } : {}) },
      },
      select: {
        id: true,
        priceCents: true,
        assetId: true,
        orderId: true,
        order: { select: { createdAt: true } },
      },
    }),
    // Per-asset counts for this creator
    prisma.asset.groupBy({
      by: ["status"],
      where: { creatorId },
      _count: { _all: true },
    }),
    prisma.assetView.aggregate({
      where: {
        asset: { creatorId },
        ...(start ? { createdAt: { gte: start } } : {}),
      },
      _count: { _all: true },
    }),
    prisma.assetDownload.aggregate({
      where: {
        asset: { creatorId },
        ...(start ? { createdAt: { gte: start } } : {}),
      },
      _count: { _all: true },
    }),
    // Top 10 assets by revenue in range
    prisma.orderItem.groupBy({
      by: ["assetId"],
      where: {
        asset: { creatorId },
        order: { status: "paid", ...(start ? { createdAt: { gte: start } } : {}) },
      },
      _sum: { priceCents: true },
      _count: { _all: true },
      orderBy: { _sum: { priceCents: "desc" } },
      take: 10,
    }),
  ]);

  // Build daily revenue series for the chart
  const dayMap = new Map<string, { revenue: number; orders: number }>();
  for (const oi of orderItems) {
    const day = oi.order.createdAt.toISOString().slice(0, 10);
    const cur = dayMap.get(day) ?? { revenue: 0, orders: 0 };
    cur.revenue += oi.priceCents;
    cur.orders += 1;
    dayMap.set(day, cur);
  }
  const daily = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, revenueCents: v.revenue, orders: v.orders }));

  const totalRevenueCents = orderItems.reduce((s, o) => s + o.priceCents, 0);
  const totalOrders = orderItems.length;
  const totalViews = viewAgg._count._all;
  const totalDownloads = downloadAgg._count._all;
  const conversionRate =
    totalViews > 0 ? (totalOrders / totalViews) * 100 : 0;

  // Lookup titles for top assets
  const topAssetIds = topAssets.map((t) => t.assetId);
  const topAssetMeta = await prisma.asset.findMany({
    where: { id: { in: topAssetIds } },
    select: { id: true, title: true, slug: true, priceCents: true },
  });
  const metaMap = new Map(topAssetMeta.map((a) => [a.id, a]));
  const topAssetsList = topAssets.map((t) => {
    const meta = metaMap.get(t.assetId);
    return {
      assetId: t.assetId,
      title: meta?.title ?? "(deleted)",
      slug: meta?.slug ?? "",
      priceCents: meta?.priceCents ?? 0,
      revenueCents: t._sum.priceCents ?? 0,
      unitsSold: t._count._all,
    };
  });

  // Asset status breakdown
  const statusCounts = Object.fromEntries(
    assetAgg.map((a) => [a.status, a._count._all])
  );

  return {
    range,
    totals: {
      revenueCents: totalRevenueCents,
      orders: totalOrders,
      views: totalViews,
      downloads: totalDownloads,
      conversionRatePct: Number(conversionRate.toFixed(2)),
    },
    assetsByStatus: statusCounts,
    daily,
    topAssets: topAssetsList,
  };
}

/**
 * Per-asset drilldown. Same data shape as overview but scoped to one asset.
 */
export async function getAssetAnalytics(
  creatorId: string,
  assetId: string,
  range: AnalyticsRange
) {
  // Verify the asset belongs to the creator (defense in depth — route
  // also checks via preHandler, but this function is safe to call directly).
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, creatorId },
    select: {
      id: true,
      title: true,
      slug: true,
      priceCents: true,
      salesCount: true,
      avgRating: true,
      reviewCount: true,
      status: true,
      createdAt: true,
    },
  });
  if (!asset) return null;

  const start = startDateFor(range);
  const where = {
    assetId,
    ...(start ? { createdAt: { gte: start } } : {}),
  };
  const orderWhere = {
    assetId,
    order: { status: "paid" as const, ...(start ? { createdAt: { gte: start } } : {}) },
  };

  const [views, downloads, orderItems, reviews, dailyViews, dailyOrders] =
    await Promise.all([
      prisma.assetView.count({ where }),
      prisma.assetDownload.count({ where }),
      prisma.orderItem.findMany({
        where: orderWhere,
        select: {
          priceCents: true,
          order: { select: { createdAt: true } },
        },
      }),
      prisma.review.findMany({
        where: { assetId },
        select: { rating: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      // Daily view series (chart)
      prisma.$queryRaw<Array<{ date: Date; views: bigint; unique: bigint }>>`
        SELECT DATE_TRUNC('day', "createdAt")::date AS date,
               COUNT(*)::bigint AS views,
               COUNT(DISTINCT "viewerId")::bigint AS "unique"
        FROM "asset_views"
        WHERE "assetId" = ${assetId} ${start ? prisma.$queryRaw`AND "createdAt" >= ${start}` : prisma.$queryRaw``}
        GROUP BY 1 ORDER BY 1
      `,
      prisma.$queryRaw<Array<{ date: Date; orders: bigint; revenue: bigint }>>`
        SELECT DATE_TRUNC('day', o."createdAt")::date AS date,
               COUNT(*)::bigint AS orders,
               COALESCE(SUM(oi."priceCents"), 0)::bigint AS revenue
        FROM "order_items" oi
        JOIN "orders" o ON o.id = oi."orderId"
        WHERE oi."assetId" = ${assetId}
          AND o.status = 'paid'
          ${start ? prisma.$queryRaw`AND o."createdAt" >= ${start}` : prisma.$queryRaw``}
        GROUP BY 1 ORDER BY 1
      `,
    ]);

  const totalRevenueCents = orderItems.reduce(
    (s, o) => s + o.priceCents,
    0
  );

  return {
    asset,
    range,
    totals: {
      revenueCents: totalRevenueCents,
      orders: orderItems.length,
      views,
      uniqueViewers: dailyViews.reduce((s, d) => s + Number(d.unique), 0),
      downloads,
      conversionRatePct:
        views > 0 ? Number(((orderItems.length / views) * 100).toFixed(2)) : 0,
      avgRating: asset.avgRating ?? 0,
      reviewCount: asset.reviewCount,
    },
    series: {
      dailyViews: dailyViews.map((d) => ({
        date: d.date.toISOString().slice(0, 10),
        views: Number(d.views),
        unique: Number(d.unique),
      })),
      dailyOrders: dailyOrders.map((d) => ({
        date: d.date.toISOString().slice(0, 10),
        orders: Number(d.orders),
        revenueCents: Number(d.revenue),
      })),
    },
    reviews,
  };
}

/**
 * Cohort retention: for each week of creator signup, how many
 * buyers-from-that-week are still active (made a purchase) in the
 * subsequent weeks. Returns a heatmap-ready matrix.
 */
export async function getCohortRetention(
  creatorId: string,
  cohortWeeks = 12
) {
  // Find every buyer who bought something from this creator,
  // grouped by the week they bought in. We use first-bought-week
  // as the cohort.
  const result = await prisma.$queryRaw<
    Array<{ cohort_week: Date; buyer_id: string; purchase_week: Date }>
  >`
    WITH first_buy AS (
      SELECT o."buyerId" AS buyer_id,
             MIN(DATE_TRUNC('week', o."createdAt")) AS cohort_week
      FROM "orders" o
      JOIN "order_items" oi ON oi."orderId" = o.id
      JOIN "assets" a ON a.id = oi."assetId"
      WHERE a."creatorId" = ${creatorId}::uuid AND o.status = 'paid'
      GROUP BY o."buyerId"
    ),
    buys AS (
      SELECT o."buyerId" AS buyer_id,
             DATE_TRUNC('week', o."createdAt") AS purchase_week
      FROM "orders" o
      JOIN "order_items" oi ON oi."orderId" = o.id
      JOIN "assets" a ON a.id = oi."assetId"
      WHERE a."creatorId" = ${creatorId}::uuid AND o.status = 'paid'
      GROUP BY o."buyerId", DATE_TRUNC('week', o."createdAt")
    )
    SELECT fb.cohort_week, fb.buyer_id, b.purchase_week
    FROM first_buy fb
    JOIN buys b ON b.buyer_id = fb.buyer_id
  `;

  // Pivot into cohort × weeks-since matrix
  const cohortMap = new Map<string, Map<number, Set<string>>>();
  for (const row of result) {
    const cohortDate_ = new Date(row.cohort_week);
    const cohort = cohortDate_.toISOString().slice(0, 10);
    const cohortMs = cohortDate_.getTime();
    const buyMs = new Date(row.purchase_week).getTime();
    const weeksSince = Math.floor((buyMs - cohortMs) / (7 * 86400000));
    if (weeksSince < 0 || weeksSince >= cohortWeeks) continue;
    if (!cohortMap.has(cohort)) cohortMap.set(cohort, new Map());
    const weekMap = cohortMap.get(cohort)!;
    if (!weekMap.has(weeksSince)) weekMap.set(weeksSince, new Set());
    weekMap.get(weeksSince)!.add(row.buyer_id);
  }

  // Flatten for heatmap rendering
  const cohorts: Array<{
    cohortWeek: string;
    size: number;
    retention: number[]; // retention[weekOffset] = pct
  }> = [];
  for (const [cohort, weekMap] of cohortMap.entries()) {
    const sizeSet = weekMap.get(0);
    const size = sizeSet?.size ?? 0;
    if (size === 0) continue;
    const retention: number[] = [];
    for (let w = 0; w < cohortWeeks; w++) {
      const active = weekMap.get(w)?.size ?? 0;
      retention.push(Number(((active / size) * 100).toFixed(1)));
    }
    cohorts.push({ cohortWeek: cohort, size, retention });
  }
  cohorts.sort((a, b) => a.cohortWeek.localeCompare(b.cohortWeek));
  return { cohorts, weeks: cohortWeeks };
}

/**
 * Period comparison: current vs previous period of equal length.
 * Returns percentage change for each metric.
 */
export async function getPeriodComparison(
  creatorId: string,
  range: AnalyticsRange
) {
  const days = RANGE_DAYS[range];
  if (days === null) return null; // "all" doesn't have a previous period

  const now = new Date();
  const currEnd = now;
  const currStart = new Date(now);
  currStart.setUTCDate(currStart.getUTCDate() - days);
  const prevEnd = new Date(currStart);
  const prevStart = new Date(currStart);
  prevStart.setUTCDate(prevStart.getUTCDate() - days);

  async function agg(from: Date, to: Date) {
    const [orders, views, downloads] = await Promise.all([
      prisma.orderItem.aggregate({
        where: {
          asset: { creatorId },
          order: { status: "paid", createdAt: { gte: from, lt: to } },
        },
        _sum: { priceCents: true },
        _count: { _all: true },
      }),
      prisma.assetView.count({
        where: {
          asset: { creatorId },
          createdAt: { gte: from, lt: to },
        },
      }),
      prisma.assetDownload.count({
        where: {
          asset: { creatorId },
          createdAt: { gte: from, lt: to },
        },
      }),
    ]);
    return {
      revenueCents: orders._sum.priceCents ?? 0,
      orders: orders._count._all,
      views,
      downloads,
    };
  }

  const [current, previous] = await Promise.all([
    agg(currStart, currEnd),
    agg(prevStart, prevEnd),
  ]);

  function pct(curr: number, prev: number): number {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Number((((curr - prev) / prev) * 100).toFixed(1));
  }

  return {
    range,
    current,
    previous,
    delta: {
      revenueCents: pct(current.revenueCents, previous.revenueCents),
      orders: pct(current.orders, previous.orders),
      views: pct(current.views, previous.views),
      downloads: pct(current.downloads, previous.downloads),
    },
  };
}

/**
 * CSV export. Streams the same data as overview but flat — for
 * accountants / power users.
 */
export async function exportCreatorCSV(
  creatorId: string,
  range: AnalyticsRange
): Promise<string> {
  const start = startDateFor(range);
  const items = await prisma.orderItem.findMany({
    where: {
      asset: { creatorId },
      order: { status: "paid", ...(start ? { createdAt: { gte: start } } : {}) },
    },
    select: {
      id: true,
      priceCents: true,
      orderId: true,
      assetId: true,
      order: { select: { createdAt: true } },
    },
  });
  const assetMeta = await prisma.asset.findMany({
    where: { id: { in: items.map((i) => i.assetId) } },
    select: { id: true, title: true, slug: true },
  });
  const metaMap = new Map(assetMeta.map((a) => [a.id, a]));

  const header = [
    "order_item_id",
    "order_id",
    "asset_id",
    "asset_title",
    "asset_slug",
    "created_at",
    "price_cents",
  ].join(",");
  const rows = items.map((it) => {
    const meta = metaMap.get(it.assetId);
    return [
      it.id,
      it.orderId,
      it.assetId,
      csvEscape(meta?.title ?? ""),
      meta?.slug ?? "",
      it.order.createdAt.toISOString(),
      it.priceCents,
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

function csvEscape(s: string): string {
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Record an asset view event. Called from the public /asset/:id page.
 */
export async function recordAssetView(input: {
  assetId: string;
  viewerId?: string | null;
  referrer?: string | null;
}): Promise<void> {
  await prisma.assetView.create({
    data: {
      assetId: input.assetId,
      viewerId: input.viewerId ?? null,
      referrer: input.referrer ?? null,
    },
  });
}

/**
 * Record an asset download event. Called from the download endpoint.
 */
export async function recordAssetDownload(input: {
  assetId: string;
  buyerId: string;
  grantId?: string | null;
}): Promise<void> {
  await prisma.assetDownload.create({
    data: {
      assetId: input.assetId,
      buyerId: input.buyerId,
      grantId: input.grantId ?? null,
    },
  });
}