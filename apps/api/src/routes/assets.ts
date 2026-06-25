import { FastifyInstance } from "fastify";
import {
  assetSearchSchema,
  createAssetSchema,
  idParamSchema,
  updateAssetSchema,
} from "@elixio/shared";
import * as assetService from "../services/assets.js";

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

  app.get("/:id", async (request) => {
    const params = idParamSchema.parse(request.params);
    return assetService.getById(params.id);
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
