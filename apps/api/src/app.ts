import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerAuth } from "./plugins/auth.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";
import { storefrontRoutes } from "./routes/storefronts.js";
import { assetRoutes } from "./routes/assets.js";
import { statsRoutes } from "./routes/stats.js";
import { categoryRoutes } from "./routes/categories.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(sensible);

  await registerErrorHandler(app);
  await registerAuth(app, { secret: env.JWT_SECRET });

  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(userRoutes, { prefix: "/users" });
  await app.register(storefrontRoutes, { prefix: "/storefronts" });
  await app.register(assetRoutes, { prefix: "/assets" });
  await app.register(categoryRoutes, { prefix: "/categories" });
  await app.register(statsRoutes, { prefix: "/stats" });

  return app;
}

export async function closeApp(): Promise<void> {
  await prisma.$disconnect();
}
