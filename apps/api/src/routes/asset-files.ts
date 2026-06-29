import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  buildAssetKey,
  generateDownloadUrl,
  generateUploadUrl,
  getObjectMetadata,
  getStorageStatus,
  objectExists,
  StorageNotConfiguredError,
  withStorageErrors,
} from "../services/storage.js";

/**
 * Asset file upload + download routes.
 *
 * Flow (creator uploads a file for an asset):
 *   1. Client calls POST /assets/:assetId/files/upload-init
 *      Body: { filename, mimeType, sizeBytes }
 *      Response: { uploadUrl, storageKey, expiresAt }
 *   2. Client PUTs the file bytes to uploadUrl directly to R2.
 *      No bytes pass through our server — saves bandwidth.
 *   3. Client calls POST /assets/:assetId/files/upload-finalize
 *      Body: { storageKey, version? }
 *      Response: { file: { id, filename, sizeBytes, ... } }
 *      Server verifies the object exists in R2, then writes the
 *      AssetFile row.
 *
 * Flow (buyer downloads):
 *   GET /downloads/:assetId (already exists in routes/downloads.ts) —
 *   verifies the buyer's grant, then returns a short-lived presigned
 *   GET URL to the latest AssetFile.
 *
 * The two-step upload lets us:
 *   - validate MIME + size before the bytes leave the user's browser
 *   - authenticate the upload with a short-lived signed URL
 *   - record the AssetFile row atomically (only if the object exists)
 */
const uploadInitSchema = z.object({
  filename: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().min(1).max(2 * 1024 * 1024 * 1024), // 2 GB
});

const uploadFinalizeSchema = z.object({
  storageKey: z.string().min(1).max(500),
  version: z.number().int().min(1).max(100).optional(),
});

// Mime types we allow. Anything outside this set is rejected at the
// upload-init step. Add new categories as the marketplace grows.
const ALLOWED_MIME_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/x-tar",
  "application/gzip",
  "application/octet-stream", // generic — we'll accept anything not in the blocklist below
  "text/",
  "font/",
];

// Explicit blocklist — types that would execute in the browser and
// are too dangerous to host on a marketplace.
const BLOCKED_MIME_TYPES = new Set([
  "application/x-msdownload", // .exe
  "application/x-msdos-program",
  "application/x-shockwave-flash",
  "application/x-sh", // shell scripts
  "application/x-csh",
  "application/javascript",
  "text/javascript",
  "application/xhtml+xml",
]);

function isAllowedMimeType(mime: string): boolean {
  const lower = mime.toLowerCase();
  if (BLOCKED_MIME_TYPES.has(lower)) return false;
  return ALLOWED_MIME_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export async function assetFileRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /v1/asset-files/storage-status
   *
   * Admin / health endpoint. Returns whether R2 is configured. Used
   * by the dashboard's "upload" UI to disable the button when the
   * platform isn't ready to accept uploads yet.
   */
  app.get("/storage-status", async () => {
    return getStorageStatus();
  });

  /**
   * POST /v1/asset-files/:assetId/upload-init
   *
   * Creator-only. Returns a presigned PUT URL the client uploads to.
   */
  app.post<{ Params: { assetId: string } }>(
    "/:assetId/upload-init",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request, reply) => {
      const { assetId } = z.object({ assetId: z.string().uuid() }).parse(request.params);
      const input = uploadInitSchema.parse(request.body);
      const creatorId = request.user.userId;

      // Verify the creator owns this asset
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { id: true, creatorId: true, status: true },
      });
      if (!asset) {
        reply.status(404).send({ error: { code: "NOT_FOUND", message: "Asset not found" } });
        return;
      }
      if (asset.creatorId !== creatorId) {
        reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Only the creator can upload files for this asset" },
        });
        return;
      }

      // Validate MIME type
      if (!isAllowedMimeType(input.mimeType)) {
        reply.status(415).send({
          error: {
            code: "MIME_NOT_ALLOWED",
            message: `File type "${input.mimeType}" is not allowed. Allowed: images, video, audio, PDFs, archives, fonts, text.`,
          },
        });
        return;
      }

      // Find next version (1 if no file exists, else max + 1)
      const lastFile = await prisma.assetFile.findFirst({
        where: { assetId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const nextVersion = (lastFile?.version ?? 0) + 1;

      const storageKey = buildAssetKey(assetId, nextVersion, input.filename);

      try {
        const presigned = await withStorageErrors(() =>
          generateUploadUrl({
            key: storageKey,
            contentType: input.mimeType,
            contentLength: input.sizeBytes,
            expiresInSeconds: 3600,
            contentDisposition: `attachment; filename="${input.filename.replace(/[\\"\r\n]/g, "_")}"`,
          }),
        );

        return {
          uploadUrl: presigned.url,
          storageKey: presigned.key,
          expiresAt: presigned.expiresAt.toISOString(),
          version: nextVersion,
        };
      } catch (e) {
        if (e instanceof StorageNotConfiguredError) {
          reply.status(503).send({
            error: {
              code: "STORAGE_NOT_CONFIGURED",
              message: "File uploads are temporarily unavailable. The platform administrator hasn't configured storage yet.",
            },
          });
          return;
        }
        throw e;
      }
    },
  );

  /**
   * POST /v1/asset-files/:assetId/upload-finalize
   *
   * Creator-only. Called after the client PUTs the file to the
   * presigned URL. Server verifies the object exists in R2 and
   * records the AssetFile row.
   */
  app.post<{ Params: { assetId: string } }>(
    "/:assetId/upload-finalize",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request, reply) => {
      const { assetId } = z.object({ assetId: z.string().uuid() }).parse(request.params);
      const input = uploadFinalizeSchema.parse(request.body);
      const creatorId = request.user.userId;

      // Verify ownership + key matches this asset
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { id: true, creatorId: true },
      });
      if (!asset) {
        reply.status(404).send({ error: { code: "NOT_FOUND", message: "Asset not found" } });
        return;
      }
      if (asset.creatorId !== creatorId) {
        reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Only the creator can finalize uploads for this asset" },
        });
        return;
      }
      if (!input.storageKey.startsWith(`assets/${assetId}/`)) {
        reply.status(400).send({
          error: {
            code: "INVALID_KEY",
            message: "Storage key does not match this asset",
          },
        });
        return;
      }

      // Verify the object actually exists in R2. Catches the case
      // where the client got a presigned URL but the PUT failed
      // (network error, user closed tab, etc.).
      let exists = false;
      let meta: { sizeBytes: number; contentType?: string; etag?: string } | null = null;
      try {
        exists = await withStorageErrors(() => objectExists(input.storageKey));
        if (exists) {
          meta = await withStorageErrors(() => getObjectMetadata(input.storageKey));
        }
      } catch (e) {
        if (e instanceof StorageNotConfiguredError) {
          reply.status(503).send({
            error: {
              code: "STORAGE_NOT_CONFIGURED",
              message: "Cannot verify upload — storage is not configured.",
            },
          });
          return;
        }
        throw e;
      }

      if (!exists || !meta) {
        reply.status(409).send({
          error: {
            code: "UPLOAD_NOT_FOUND",
            message:
              "We couldn't find the uploaded file in storage. Please retry the upload.",
          },
        });
        return;
      }

      // Determine version from the key (assets/{id}/v{n}/filename)
      const match = input.storageKey.match(/^assets\/[^/]+\/v(\d+)\//);
      const version = match ? parseInt(match[1], 10) : (input.version ?? 1);

      // Write the AssetFile row
      const filename = decodeURIComponent(input.storageKey.split("/").pop() ?? "file");
      const file = await prisma.assetFile.create({
        data: {
          assetId,
          storageKey: input.storageKey,
          filename,
          mimeType: meta.contentType ?? "application/octet-stream",
          sizeBytes: meta.sizeBytes,
          version,
        },
        select: {
          id: true,
          storageKey: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          version: true,
        },
      });

      return { file };
    },
  );

  /**
   * DELETE /v1/asset-files/:assetId/files/:fileId
   *
   * Creator-only. Deletes an AssetFile and the underlying R2 object.
   */
  app.delete<{ Params: { assetId: string; fileId: string } }>(
    "/:assetId/files/:fileId",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request, reply) => {
      const { assetId, fileId } = z
        .object({
          assetId: z.string().uuid(),
          fileId: z.string().uuid(),
        })
        .parse(request.params);
      const creatorId = request.user.userId;

      const file = await prisma.assetFile.findUnique({
        where: { id: fileId },
        select: { id: true, assetId: true, storageKey: true },
      });
      if (!file || file.assetId !== assetId) {
        reply.status(404).send({ error: { code: "NOT_FOUND", message: "File not found" } });
        return;
      }
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { creatorId: true },
      });
      if (!asset || asset.creatorId !== creatorId) {
        reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Only the creator can delete this file" },
        });
        return;
      }

      // Delete from R2 first (if it fails, we abort and the DB row stays)
      try {
        await withStorageErrors(() => deleteObject(file.storageKey));
      } catch (e) {
        if (!(e instanceof StorageNotConfiguredError)) {
          request.log.error({ err: e }, "Failed to delete R2 object");
          reply.status(502).send({
            error: {
              code: "STORAGE_DELETE_FAILED",
              message: "Failed to delete file from storage. Try again later.",
            },
          });
          return;
        }
        // Storage unconfigured — proceed to delete DB row (orphan-safe)
      }
      await prisma.assetFile.delete({ where: { id: fileId } });
      reply.status(204).send();
    },
  );

  /**
   * GET /v1/asset-files/:assetId/files
   *
   * Creator-only. Lists all files (versions) for an asset.
   */
  app.get<{ Params: { assetId: string } }>(
    "/:assetId/files",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request, reply) => {
      const { assetId } = z.object({ assetId: z.string().uuid() }).parse(request.params);
      const creatorId = request.user.userId;

      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { creatorId: true },
      });
      if (!asset) {
        reply.status(404).send({ error: { code: "NOT_FOUND", message: "Asset not found" } });
        return;
      }
      if (asset.creatorId !== creatorId) {
        reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Only the creator can list files for this asset" },
        });
        return;
      }

      const files = await prisma.assetFile.findMany({
        where: { assetId },
        orderBy: { version: "desc" },
        select: {
          id: true,
          storageKey: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          version: true,
        },
      });
      return { files };
    },
  );
}

// Re-export the download-url generator so downloads.ts can use it
// without circular import gymnastics.
export { generateDownloadUrl };

// Helper needed by the delete route (kept local to avoid exporting
// too many internal helpers from storage.ts).
import { deleteObject } from "../services/storage.js";