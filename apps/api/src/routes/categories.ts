import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { mapCategory } from "../lib/mappers.js";

export async function categoryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return categories.map(mapCategory);
  });
}
