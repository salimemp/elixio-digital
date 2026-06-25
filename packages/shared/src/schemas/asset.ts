import { z } from "zod";

export const assetStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
  "rejected",
]);

export const licenseCodeSchema = z.enum([
  "personal",
  "commercial",
  "extended",
]);

export const createAssetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  categoryId: z.string().uuid(),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
  priceCents: z.number().int().nonnegative().max(100000000),
  currency: z.string().length(3).toUpperCase(),
  licenseCode: licenseCodeSchema,
});

export const updateAssetSchema = createAssetSchema.partial();

export const assetSearchSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  sort: z.enum(["newest", "popular", "price_asc", "price_desc"]).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const createDiscountCodeSchema = z.object({
  code: z.string().min(1).max(50),
  percentOff: z.number().int().min(0).max(100),
  maxRedemptions: z.number().int().positive().nullish(),
  expiresAt: z.string().datetime().nullish(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssetSearchInput = z.infer<typeof assetSearchSchema>;
export type LicenseCode = z.infer<typeof licenseCodeSchema>;
export type CreateDiscountCodeInput = z.infer<typeof createDiscountCodeSchema>;
