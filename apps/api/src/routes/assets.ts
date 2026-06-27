import { FastifyInstance } from "fastify";
import {
  assetSearchSchema,
  createAssetSchema,
  idParamSchema,
  updateAssetSchema,
} from "@elixio/shared";
import * as assetService from "../services/assets.js";
import { recordAssetView } from "../services/analytics.js";

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request) => {
    const input = assetSearchSchema.parse(request.query);
    return assetService.search(input);
  });

  app.post("/", { preHandler: [app.authenticate, app.requireCreator] }, async (request, reply) => {
    const input = createAssetSchema.parse(request.body);
    const asset = await assetService.create(input, request.user.userId);
    reply.status(201).send(asset);
  });

  // Public asset page view. Fire-and-forget records a view event for
  // creator analytics (funnel: views → orders → downloads). Wrapped so
  // a DB hiccup never breaks the public page render.
  // If the request carries a valid JWT we attribute the view to that
  // user (so creators see "X unique viewers" rather than N anonymous
  // hits). Auth is OPTIONAL here — anonymous views are logged too.
  app.get("/:id", async (request) => {
    const params = idParamSchema.parse(request.params);

    // Optional JWT verification — populates request.user if a valid
    // bearer token is present, but never blocks anonymous viewers.
    if (request.headers.authorization) {
      try {
        await request.jwtVerify();
      } catch {
        // invalid/expired token — treat as anonymous, don't error
      }
    }

    const asset = await assetService.getById(params.id);
    const viewerId = request.user?.userId ?? null;
    const referrer =
      (request.headers.referer as string | undefined) ??
      (request.headers.referrer as string | undefined) ??
      null;

    // Fire-and-forget view tracking. Not awaited — the public page
    // should render even if the analytics DB is slow.
    void recordAssetView({ assetId: params.id, viewerId, referrer }).catch(
      () => {
        // Swallow — never let analytics break the user-facing page.
      }
    );

    return asset;
  });

  app.patch("/:id", { preHandler: [app.authenticate, app.requireCreator] }, async (request) => {
    const params = idParamSchema.parse(request.params);
    const input = updateAssetSchema.parse(request.body);
    return assetService.update(params.id, input, request.user.userId);
  });

  app.post("/:id/publish", { preHandler: [app.authenticate, app.requireCreator] }, async (request) => {
    const params = idParamSchema.parse(request.params);
    return assetService.publish(params.id, request.user.userId);
  });

  app.post("/:id/archive", { preHandler: [app.authenticate, app.requireCreator] }, async (request) => {
    const params = idParamSchema.parse(request.params);
    return assetService.archive(params.id, request.user.userId);
  });

  app.delete("/:id", { preHandler: [app.authenticate, app.requireCreator] }, async (request, reply) => {
    const params = idParamSchema.parse(request.params);
    await assetService.remove(params.id, request.user.userId);
    reply.status(204).send();
  });
}
