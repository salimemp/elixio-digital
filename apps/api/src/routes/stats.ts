import { FastifyInstance } from "fastify";
import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

/**
 * Public stats for the /stats dashboard.
 *
 * No auth — these are aggregated counts we want the world to see. The
 * response is cached at the CDN edge for 60s.
 */
export async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (_request, reply) => {
    // Run all counts in parallel — the prisma client serializes them, but
    // a single Promise.all still saves round-trip time on cold queries.
    const [
      totalUsers,
      creators,
      verifiedUsers,
      mfaEnabledUsers,
      totalAssets,
      publishedAssets,
      totalOrders,
      paidOrders,
      totalStorefronts,
      totalCategories,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isCreator: true } }),
      prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      prisma.user.count({ where: { mfaEnabled: true } }),
      prisma.asset.count(),
      prisma.asset.count({ where: { status: "published" } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "paid" } }),
      prisma.storefront.count(),
      prisma.category.count(),
    ]);

    // GMV = sum of paid orders in cents. We expose dollars (or whatever
    // major unit) by dividing by 100. (Currencies are TBD — we have
    // only USD price fields so far.)
    const paidOrdersSum = await prisma.order.aggregate({
      where: { status: "paid" },
      _sum: { totalCents: true, platformFeeCents: true, subtotalCents: true },
    });
    const sum = paidOrdersSum._sum ?? {};
    const grossCents = sum.totalCents ?? 0;
    const feeCents = sum.platformFeeCents ?? 0;
    const grossUsd = grossCents / 100;
    const platformFeesUsd = feeCents / 100;
    const creatorEarningsUsd = grossUsd - platformFeesUsd;

    reply.header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");

    return {
      generatedAt: new Date().toISOString(),
      users: {
        total: totalUsers,
        creators,
        verified: verifiedUsers,
        withMfa: mfaEnabledUsers,
      },
      content: {
        assets: totalAssets,
        publishedAssets,
        storefronts: totalStorefronts,
        categories: totalCategories,
      },
      orders: {
        total: totalOrders,
        paid: paidOrders,
      },
      gmv: {
        grossUsd,
        creatorEarningsUsd,
        platformFeesUsd,
        currency: "USD",
      },
      // Languages at launch — hard-coded for now; we have it in the
      // product spec (25+ languages at launch per docs/PLAN.md).
      languages: 25,
    };
  });
}
