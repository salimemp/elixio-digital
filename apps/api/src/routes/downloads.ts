import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { recordAssetDownload } from "../services/analytics.js";

/**
 * Buyer-facing download routes. Buyer-only (requireBuyer). Every
 * download attempt records an AssetDownload row so creators see
 * download counts in their analytics dashboard.
 *
 * File streaming: when R2/S3 is wired up, the redirect target
 * becomes a presigned URL. For now (Phase 1, no R2 yet) we return
 * a 501 with the storageKey so the client knows the file is on
 * the way.
 */
export async function downloadRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /downloads/:assetId
   *
   * Looks up a valid DownloadGrant for the authenticated buyer +
   * the requested asset. If valid, records a download event and
   * returns the file (or a 302 to a presigned URL once R2 ships).
   */
  app.get<{ Params: { assetId: string } }>(
    "/:assetId",
    { preHandler: [app.authenticate, app.requireBuyer] },
    async (request, reply) => {
      const { assetId } = z
        .object({ assetId: z.string().uuid() })
        .parse(request.params);
      const buyerId = request.user.userId;

      // Verify asset exists + is published
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { id: true, status: true, creatorId: true },
      });
      if (!asset) {
        reply
          .status(404)
          .send({ error: { code: "NOT_FOUND", message: "Asset not found" } });
        return;
      }

      // Find the most recent valid grant for this buyer + asset
      const grant = await prisma.downloadGrant.findFirst({
        where: {
          buyerId,
          orderItem: { assetId },
          expiresAt: { gt: new Date() },
        },
        include: {
          orderItem: { select: { id: true, assetId: true, priceCents: true } },
        },
        orderBy: { expiresAt: "desc" },
      });
      if (!grant) {
        reply.status(403).send({
          error: {
            code: "NO_GRANT",
            message: "No valid download grant. Purchase this asset first.",
          },
        });
        return;
      }

      if (grant.downloadCount >= grant.maxDownloads) {
        reply.status(403).send({
          error: {
            code: "GRANT_EXHAUSTED",
            message: "Download limit reached for this purchase.",
          },
        });
        return;
      }

      // Increment grant counter
      await prisma.downloadGrant.update({
        where: { id: grant.id },
        data: { downloadCount: { increment: 1 } },
      });

      // Record analytics event. Fire-and-forget so a slow analytics
      // insert never blocks the user from getting their file.
      void recordAssetDownload({
        assetId,
        buyerId,
        grantId: grant.id,
      }).catch(() => {
        // swallow — analytics shouldn't break downloads
      });

      // Look up the actual file to stream
      const file = await prisma.assetFile.findFirst({
        where: { assetId },
        orderBy: { version: "desc" },
        select: { id: true, storageKey: true, filename: true, mimeType: true, sizeBytes: true },
      });
      if (!file) {
        // Asset is set up for purchase but no file uploaded yet
        reply.status(501).send({
          error: {
            code: "NO_FILE",
            message:
              "Asset has no file attached yet. The creator needs to upload before download is possible.",
          },
        });
        return;
      }

      // Phase 1: return the storage key as a placeholder. Phase 2: R2 presigned URL.
      reply.send({
        ok: true,
        grantId: grant.id,
        downloadsRemaining: grant.maxDownloads - grant.downloadCount - 1,
        file: {
          id: file.id,
          filename: file.filename,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          storageKey: file.storageKey,
          // downloadUrl will become a presigned URL once R2 ships
          downloadUrl: null,
        },
      });
    }
  );

  /**
   * GET /downloads/history
   *
   * List recent downloads by this buyer (for the library page).
   */
  app.get(
    "/history/list",
    { preHandler: [app.authenticate, app.requireBuyer] },
    async (request) => {
      const rows = await prisma.assetDownload.findMany({
        where: { buyerId: request.user.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          assetId: true,
          grantId: true,
          createdAt: true,
        },
      });
      return { downloads: rows };
    }
  );
}