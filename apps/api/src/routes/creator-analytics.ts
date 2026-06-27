import { FastifyInstance } from "fastify";
import * as analytics from "../services/analytics.js";
import { analyticsRangeSchema } from "@elixio/shared";

/**
 * Creator-only analytics endpoints. Every route here requires the
 * user to be a creator (enforced by the preHandler `app.requireCreator`).
 * Defense in depth: the service layer also re-checks ownership when
 * fetching per-asset data.
 */
export async function creatorAnalyticsRoutes(app: FastifyInstance): Promise<void> {
  // GET /creator/analytics/overview?range=30d
  app.get(
    "/overview",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request) => {
      const range = analyticsRangeSchema.parse(
        (request.query as Record<string, unknown>)?.range ?? "30d"
      );
      const data = await analytics.getCreatorOverview(request.user.userId, range);
      return data;
    }
  );

  // GET /creator/analytics/assets/:assetId?range=30d
  app.get<{ Params: { assetId: string } }>(
    "/assets/:assetId",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request, reply) => {
      const range = analyticsRangeSchema.parse(
        (request.query as Record<string, unknown>)?.range ?? "30d"
      );
      const data = await analytics.getAssetAnalytics(
        request.user.userId,
        request.params.assetId,
        range
      );
      if (!data) {
        reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Asset not found" },
        });
        return;
      }
      return data;
    }
  );

  // GET /creator/analytics/cohorts
  app.get(
    "/cohorts",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request) => {
      const weeksParam = (request.query as Record<string, unknown>)?.weeks;
      const weeks = Math.min(
        Math.max(1, Number(weeksParam ?? 12)),
        52
      );
      return analytics.getCohortRetention(request.user.userId, weeks);
    }
  );

  // GET /creator/analytics/compare?range=30d
  app.get(
    "/compare",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request, reply) => {
      const range = analyticsRangeSchema.parse(
        (request.query as Record<string, unknown>)?.range ?? "30d"
      );
      const data = await analytics.getPeriodComparison(request.user.userId, range);
      if (!data) {
        reply.status(400).send({
          error: { code: "BAD_REQUEST", message: "Period compare only works with bounded ranges" },
        });
        return;
      }
      return data;
    }
  );

  // GET /creator/analytics/export.csv?range=90d
  app.get(
    "/export.csv",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request, reply) => {
      const range = analyticsRangeSchema.parse(
        (request.query as Record<string, unknown>)?.range ?? "30d"
      );
      const csv = await analytics.exportCreatorCSV(request.user.userId, range);
      reply
        .header("content-type", "text/csv; charset=utf-8")
        .header(
          "content-disposition",
          `attachment; filename="elixio-analytics-${range}.csv"`
        )
        .send(csv);
    }
  );
}