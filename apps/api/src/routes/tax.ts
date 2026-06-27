import { FastifyInstance } from "fastify";
import { z } from "zod";
import * as tax from "../services/tax.js";

const calcSchema = z.object({
  baseCents: z.number().int().min(0).max(1_000_000_00),
  address: z.object({
    country: z.string().length(2),
    region: z.string().max(10).optional(),
    postalCode: z.string().max(20).optional(),
    // India-only: GST slab selector (0/5/12/18/28). Becomes the
    // region's discriminator ("IN-GST-18") inside the service.
    gstSlab: z.string().max(10).optional(),
  }),
});

const listSchema = z.object({
  country: z.string().length(2).optional(),
});

/**
 * Tax routes. Public read-only (no auth) so checkout can show a
 * tax breakdown before login. Admin can re-seed the rate table.
 */
export async function taxRoutes(app: FastifyInstance): Promise<void> {
  // POST /tax/calculate — given a base amount + billing address,
  // return the tax lines that would apply.
  app.post("/calculate", async (request) => {
    const input = calcSchema.parse(request.body);
    return tax.calculateTax(input.baseCents, input.address);
  });

  // GET /tax/regions?country=US — list known tax regions.
  app.get("/regions", async (request) => {
    const query = listSchema.parse(request.query);
    return { regions: await tax.listTaxRegions(query.country) };
  });

  // POST /tax/seed — admin-only. Re-seed the TaxRegion table from
  // the canonical rate list in services/tax-rates.ts.
  app.post(
    "/seed",
    { preHandler: [app.authenticate, app.requireAdmin] },
    async () => {
      const result = await tax.seedTaxRegions();
      return result;
    }
  );
}