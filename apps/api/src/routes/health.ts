import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => ({ status: "ok" }));

  app.get("/ready", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  });
}
