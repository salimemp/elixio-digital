import { z } from "zod";
import { licenseCodeSchema } from "./asset.js";

export const orderStatusSchema = z.enum([
  "pending",
  "paid",
  "refunded",
  "failed",
]);

export const addCartItemSchema = z.object({
  assetId: z.string().uuid(),
});

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const checkoutSchema = z.object({
  discountCode: z.string().max(50).optional(),
});

export const presignedUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
});

export const storefrontUpdateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  bannerUrl: z.string().url().nullish(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  socialLinks: z
    .object({
      website: z.string().url().optional(),
      twitter: z.string().url().optional(),
      instagram: z.string().url().optional(),
      youtube: z.string().url().optional(),
      github: z.string().url().optional(),
      linkedin: z.string().url().optional(),
    })
    .optional(),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type PresignedUploadInput = z.infer<typeof presignedUploadSchema>;
export type StorefrontUpdateInput = z.infer<typeof storefrontUpdateSchema>;
export { licenseCodeSchema };
