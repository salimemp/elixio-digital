import { FastifyInstance } from "fastify";
import { slugParamSchema, storefrontUpdateSchema } from "@elixio/shared";
import * as storefrontService from "../services/storefronts.js";

export async function storefrontRoutes(app: FastifyInstance): Promise<void> {
  app.get("/:slug", async (request) => {
    const params = slugParamSchema.parse(request.params);
    const storefront = await storefrontService.getBySlug(params.slug);
    return storefront;
  });

  app.patch("/me", { preHandler: [app.authenticate, app.requireCreator] }, async (request) => {
    const input = storefrontUpdateSchema.parse(request.body);
    const storefront = await storefrontService.update(request.user.userId, input);
    return storefront;
  });
}
