import { randomBytes } from "node:crypto";
import { FastifyInstance } from "fastify";
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from "@elixio/shared";
import * as authService from "../services/auth.js";

function createSigner(app: FastifyInstance): authService.TokenSigner {
  return {
    signAccessToken: (payload) => app.jwt.sign(payload),
    createRefreshToken: () => randomBytes(64).toString("hex"),
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/register", async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const session = await authService.register(input, createSigner(app));
    reply.status(201).send(session);
  });

  app.post("/login", async (request) => {
    const input = loginSchema.parse(request.body);
    const session = await authService.login(input, createSigner(app));
    return session;
  });

  app.post("/refresh", async (request) => {
    const input = refreshSchema.parse(request.body);
    const session = await authService.refresh(input.refreshToken, createSigner(app));
    return session;
  });

  app.post("/logout", async (request, reply) => {
    const input = refreshSchema.parse(request.body);
    await authService.logout(input.refreshToken);
    reply.status(204).send();
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (request) => {
    const user = await authService.me(request.user.userId);
    return user;
  });

  app.patch("/change-password", { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = changePasswordSchema.parse(request.body);
    await authService.changePassword(request.user.userId, input);
    reply.status(204).send();
  });
}
