import { FastifyInstance } from "fastify";
import { z } from "zod";
import * as bulk from "../services/bulk-ops.js";

const bulkOpSchema = z.object({
  kind: z.enum([
    "price_update",
    "tag_add",
    "tag_remove",
    "publish",
    "archive",
    "delete",
    "category_change",
  ]),
  assetIds: z.array(z.string().uuid()).min(1).max(500),
  payload: z.record(z.unknown()),
});

/**
 * Bulk operations endpoint. Creator-only. Accepts up to 500 asset IDs
 * per call. Records an audit row that can be rolled back (where possible).
 */
export async function bulkOpsRoutes(app: FastifyInstance): Promise<void> {
  // POST /creator/bulk
  app.post(
    "/",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request) => {
      const input = bulkOpSchema.parse(request.body);
      const result = await bulk.runBulkOp({
        creatorId: request.user.userId,
        kind: input.kind,
        assetIds: input.assetIds,
        payload: input.payload,
      });
      return result;
    }
  );

  // POST /creator/bulk/:operationId/rollback
  app.post<{ Params: { operationId: string } }>(
    "/:operationId/rollback",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request, reply) => {
      const result = await bulk.rollbackBulkOp(
        request.user.userId,
        request.params.operationId
      );
      if (!result.rolledBack) {
        reply.status(400).send({
          error: { code: "ROLLBACK_FAILED", message: result.reason ?? "Rollback failed" },
        });
        return;
      }
      return result;
    }
  );

  // GET /creator/bulk/history
  app.get(
    "/history",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request) => {
      const { prisma } = await import("../lib/prisma.js");
      const ops = await prisma.bulkOperation.findMany({
        where: { creatorId: request.user.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          kind: true,
          affectedIds: true,
          createdAt: true,
          rolledBackAt: true,
        },
      });
      return { operations: ops };
    }
  );
}