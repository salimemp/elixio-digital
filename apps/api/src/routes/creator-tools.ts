import { FastifyInstance } from "fastify";
import { z } from "zod";
import * as tools from "../services/creator-tools.js";

const thumbnailSchema = z.object({
  // base64-encoded buffer (we accept base64 to keep the JSON request simple)
  base64: z.string().min(1),
  width: z.number().int().min(50).max(4000).optional(),
  format: z.enum(["webp", "jpeg", "png"]).optional(),
});

const bundleSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        base64: z.string().min(1),
      })
    )
    .min(1)
    .max(100),
  comment: z.string().max(500).optional(),
});

const metadataSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.string().min(1),
  filename: z.string().max(255).optional(),
});

/**
 * Creator tools endpoints. Convert + package helpers + metadata
 * extraction. All require creator role (enforced by preHandler).
 * File uploads use base64 to keep the API JSON-only; for large files
 * (>5MB) we'd switch to multipart upload to R2 — Phase 2.
 */
export async function creatorToolsRoutes(app: FastifyInstance): Promise<void> {
  // POST /creator/tools/thumbnail
  app.post(
    "/thumbnail",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request) => {
      const input = thumbnailSchema.parse(request.body);
      const result = await tools.makeThumbnail({
        buffer: Buffer.from(input.base64, "base64"),
        width: input.width,
        format: input.format,
      });
      return {
        ...result,
        // Return as base64 so the client can preview without a separate fetch
        base64: result.buffer.toString("base64"),
      };
    }
  );

  // POST /creator/tools/bundle  (zip multiple files)
  app.post(
    "/bundle",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request) => {
      const input = bundleSchema.parse(request.body);
      const result = await tools.bundleZip({
        comment: input.comment,
        files: input.files.map((f) => ({
          name: f.name,
          buffer: Buffer.from(f.base64, "base64"),
        })),
      });
      return {
        ...result,
        base64: result.buffer.toString("base64"),
      };
    }
  );

  // POST /creator/tools/metadata
  app.post(
    "/metadata",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request) => {
      const input = metadataSchema.parse(request.body);
      const meta = await tools.extractMetadata({
        buffer: Buffer.from(input.base64, "base64"),
        mimeType: input.mimeType,
        filename: input.filename,
      });
      return meta;
    }
  );

  // POST /creator/tools/pdf-to-images  (Phase 1 placeholder; full fidelity in Phase 2)
  app.post<{ Body: { base64: string; dpi?: number; format?: "png" | "jpeg" | "webp" } }>(
    "/pdf-to-images",
    { preHandler: [app.authenticate, app.requireCreator] },
    async (request) => {
      const input = request.body;
      const result = await tools.pdfToImages({
        pdfBuffer: Buffer.from(input.base64, "base64"),
        dpi: input.dpi,
        format: input.format,
      });
      return {
        totalPages: result.totalPages,
        totalBytes: result.totalBytes,
        pages: result.pages.map((p) => ({
          pageNumber: p.pageNumber,
          width: p.width,
          height: p.height,
          format: p.format,
          sizeBytes: p.sizeBytes,
          base64: p.buffer.toString("base64"),
        })),
      };
    }
  );
}