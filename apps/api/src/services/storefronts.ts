import { prisma } from "../lib/prisma.js";
import { mapStorefront } from "../lib/mappers.js";
import { httpError } from "../lib/errors.js";
import type { Storefront, StorefrontUpdateInput } from "@elixio/shared";
import type { Prisma } from "@prisma/client";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function getBySlug(slug: string): Promise<Storefront> {
  const storefront = await prisma.storefront.findUnique({ where: { slug } });

  if (!storefront) {
    throw httpError("Storefront not found", 404, "NOT_FOUND");
  }

  return mapStorefront(storefront);
}

export async function update(userId: string, input: StorefrontUpdateInput): Promise<Storefront> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw httpError("User not found", 404, "NOT_FOUND");
  }

  if (!user.isCreator && user.role !== "admin") {
    throw httpError("Forbidden", 403, "FORBIDDEN");
  }

  const existing = await prisma.storefront.findUnique({ where: { userId } });

  const data: Prisma.StorefrontUpdateInput = {};

  if (input.slug !== undefined) {
    data.slug = input.slug;
  }

  if (input.bannerUrl !== undefined) {
    data.bannerUrl = input.bannerUrl ?? null;
  }

  if (input.accentColor !== undefined) {
    data.accentColor = input.accentColor ?? null;
  }

  if (input.socialLinks !== undefined) {
    data.socialLinks = input.socialLinks as Prisma.InputJsonValue;
  }

  const storefront = existing
    ? await prisma.storefront.update({ where: { userId }, data })
    : await prisma.storefront.create({
        data: {
          userId,
          slug: input.slug ?? slugify(user.displayName),
          bannerUrl: input.bannerUrl ?? null,
          accentColor: input.accentColor ?? null,
          socialLinks: (input.socialLinks as Prisma.InputJsonValue) ?? {},
        },
      });

  return mapStorefront(storefront);
}
