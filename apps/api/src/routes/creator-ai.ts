import { FastifyInstance } from "fastify";
import { z } from "zod";
import * as ai from "../services/ai-creator.js";
import * as analytics from "../services/analytics.js";
import { analyticsRangeSchema } from "@elixio/shared";

const listingInputSchema = z.object({
  assetDescription: z.string().min(20).max(2000),
  category: z.string().max(100).optional(),
  fileFormats: z.array(z.string()).max(10).optional(),
  suggestedPriceCents: z.number().int().min(0).max(1_000_000).optional(),
});

const critiqueInputSchema = z.object({
  imageUrl: z.string().url(),
  assetKind: z.string().min(3).max(100),
  question: z.string().max(500).optional(),
});

/**
 * Creator AI endpoints. All require creator role (enforced by
 * app.requireCreator). Rate-limited to 60 calls/hour per creator —
 * generous for normal use, prevents abuse.
 */
export async function creatorAIRoutes(app: FastifyInstance): Promise<void> {
  // POST /creator/ai/listing-copywriter
  app.post(
    "/listing-copywriter",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request) => {
      const input = listingInputSchema.parse(request.body);
      const out = await ai.runListingCopywriter(request.user.userId, input);
      return out;
    }
  );

  // POST /creator/ai/asset-critique
  app.post(
    "/asset-critique",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request) => {
      const input = critiqueInputSchema.parse(request.body);
      const out = await ai.runAssetCritique(request.user.userId, input);
      return out;
    }
  );

  // GET /creator/ai/sales-coach?range=30d
  app.get(
    "/sales-coach",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request) => {
      const range = analyticsRangeSchema.parse(
        (request.query as Record<string, unknown>)?.range ?? "30d"
      );
      const overview = await analytics.getCreatorOverview(request.user.userId, range);
      const detail = await Promise.all(
        overview.topAssets.slice(0, 5).map(async (a) => {
          const d = await analytics.getAssetAnalytics(request.user.userId, a.assetId, range);
          return d;
        })
      );
      const out = await ai.runSalesCoach(request.user.userId, {
        overview,
        topAssetsDetail: detail.filter(Boolean),
      });
      return out;
    }
  );

  // GET /creator/ai/history — list previous AI generations for this creator
  app.get(
    "/history",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request) => {
      const { prisma } = await import("../lib/prisma.js");
      const rows = await prisma.aIGeneration.findMany({
        where: { creatorId: request.user.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          kind: true,
          status: true,
          createdAt: true,
          completedAt: true,
          durationMs: true,
          errorMessage: true,
        },
      });
      return { history: rows };
    }
  );
}