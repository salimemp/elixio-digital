import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { mapCategory } from "../lib/mappers.js";

const createCategorySchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "lowercase letters, digits, hyphens only"),
  parentId: z.string().uuid().optional(),
});

export async function categoryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return categories.map(mapCategory);
  });

  /**
   * POST /categories — admin-only. Create a new category.
   * Used by the platform admin to seed and manage the category tree.
   * Public users cannot create categories.
   */
  app.post(
    "/",
    { preHandler: [app.authenticate, app.requireAdmin] },
    async (request, reply) => {
      const input = createCategorySchema.parse(request.body);
      // Slug uniqueness — slug is unique by schema
      const existing = await prisma.category.findUnique({
        where: { slug: input.slug },
      });
      if (existing) {
        return reply.status(409).send({
          error: {
            code: "CONFLICT",
            message: `Category with slug "${input.slug}" already exists`,
          },
        });
      }
      const cat = await prisma.category.create({
        data: {
          name: input.name,
          slug: input.slug,
          parentId: input.parentId ?? null,
        },
      });
      reply.status(201).send(mapCategory(cat));
    }
  );
}