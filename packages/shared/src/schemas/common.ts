import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(200),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.unknown()).optional(),
  }),
});

/**
 * Analytics time-range selector. Used by every creator analytics route.
 */
export const analyticsRangeSchema = z.enum(["7d", "30d", "90d", "1y", "all"]);
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;

export type PaginationInput = z.infer<typeof paginationSchema>;
