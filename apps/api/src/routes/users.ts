import { FastifyInstance } from "fastify";
import { idParamSchema, updateProfileSchema } from "@elixio/shared";
import * as userService from "../services/users.js";

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get("/:id", async (request) => {
    const params = idParamSchema.parse(request.params);
    const user = await userService.getPublicProfile(params.id);
    return user;
  });

  app.patch("/me", { preHandler: [app.authenticate] }, async (request) => {
    const input = updateProfileSchema.parse(request.body);
    const user = await userService.updateProfile(request.user.userId, input);
    return user;
  });

  app.post("/me/become-creator", { preHandler: [app.authenticate] }, async (request) => {
    const user = await userService.becomeCreator(request.user.userId);
    return user;
  });
}
