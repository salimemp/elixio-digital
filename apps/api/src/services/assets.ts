import { prisma } from "../lib/prisma.js";
import { mapAsset, mapAssetDetail } from "../lib/mappers.js";
import { httpError } from "../lib/errors.js";
import type {
  Asset,
  AssetDetail,
  AssetSearchInput,
  CreateAssetInput,
  PaginatedResponse,
  UpdateAssetInput,
} from "@elixio/shared";
import type { AssetStatus, LicenseCode, Prisma } from "@prisma/client";

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return `${base}-${Date.now().toString(36)}`;
}

async function assertOwnerOrAdmin(
  asset: { creatorId: string },
  userId: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw httpError("Unauthorized", 401, "UNAUTHORIZED");
  }

  if (asset.creatorId !== userId && user.role !== "admin") {
    throw httpError("Forbidden", 403, "FORBIDDEN");
  }
}

async function resolveLicense(code: LicenseCode): Promise<{ id: string }> {
  const license = await prisma.license.findUnique({ where: { code } });

  if (!license) {
    throw httpError("License not found", 404, "NOT_FOUND");
  }

  return license;
}

function buildTagConnections(names: string[]): Prisma.AssetTagCreateWithoutAssetInput[] {
  const uniqueNames = Array.from(new Set(names.map((name) => name.toLowerCase())));

  return uniqueNames.map((name) => ({
    tag: {
      connectOrCreate: {
        where: { name },
        create: { name },
      },
    },
  }));
}

export async function search(input: AssetSearchInput): Promise<PaginatedResponse<Asset>> {
  const where: Prisma.AssetWhereInput = { status: "published" };

  if (input.q) {
    where.OR = [
      { title: { contains: input.q, mode: "insensitive" } },
      { description: { contains: input.q, mode: "insensitive" } },
    ];
  }

  if (input.category) {
    where.category = { slug: input.category };
  }

  if (input.tag) {
    where.tags = { some: { tag: { name: input.tag.toLowerCase() } } };
  }

  if (input.minPrice !== undefined || input.maxPrice !== undefined) {
    where.priceCents = {};
    if (input.minPrice !== undefined) {
      where.priceCents.gte = input.minPrice;
    }
    if (input.maxPrice !== undefined) {
      where.priceCents.lte = input.maxPrice;
    }
  }

  const orderBy: Prisma.AssetOrderByWithRelationInput = {};

  switch (input.sort) {
    case "popular":
      orderBy.salesCount = "desc";
      break;
    case "price_asc":
      orderBy.priceCents = "asc";
      break;
    case "price_desc":
      orderBy.priceCents = "desc";
      break;
    case "newest":
    default:
      orderBy.createdAt = "desc";
  }

  const skip = (input.page - 1) * input.limit;

  const [items, total] = await Promise.all([
    prisma.asset.findMany({ where, orderBy, skip, take: input.limit }),
    prisma.asset.count({ where }),
  ]);

  return {
    items: items.map(mapAsset),
    page: input.page,
    limit: input.limit,
    total,
    hasMore: skip + items.length < total,
  };
}

export async function create(input: CreateAssetInput, creatorId: string): Promise<Asset> {
  const user = await prisma.user.findUnique({ where: { id: creatorId } });

  if (!user || (!user.isCreator && user.role !== "admin")) {
    throw httpError("Forbidden", 403, "FORBIDDEN");
  }

  const license = await resolveLicense(input.licenseCode);

  const asset = await prisma.asset.create({
    data: {
      creatorId,
      title: input.title,
      slug: generateSlug(input.title),
      description: input.description,
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      currency: input.currency,
      licenseId: license.id,
      status: "draft",
      tags: { create: buildTagConnections(input.tags) },
    },
  });

  return mapAsset(asset);
}

export async function getById(id: string): Promise<AssetDetail> {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      creator: true,
      category: true,
      license: true,
      tags: { include: { tag: true } },
      media: { orderBy: { position: "asc" } },
      files: true,
    },
  });

  if (!asset) {
    throw httpError("Asset not found", 404, "NOT_FOUND");
  }

  return mapAssetDetail(asset);
}

export async function update(
  id: string,
  input: UpdateAssetInput,
  userId: string
): Promise<Asset> {
  const asset = await prisma.asset.findUnique({ where: { id } });

  if (!asset) {
    throw httpError("Asset not found", 404, "NOT_FOUND");
  }

  await assertOwnerOrAdmin(asset, userId);

  const data: Prisma.AssetUpdateInput = {};

  if (input.title !== undefined) {
    data.title = input.title;
  }

  if (input.description !== undefined) {
    data.description = input.description;
  }

  if (input.categoryId !== undefined) {
    data.category = { connect: { id: input.categoryId } };
  }

  if (input.priceCents !== undefined) {
    data.priceCents = input.priceCents;
  }

  if (input.currency !== undefined) {
    data.currency = input.currency;
  }

  if (input.licenseCode !== undefined) {
    const license = await resolveLicense(input.licenseCode);
    data.license = { connect: { id: license.id } };
  }

  if (input.tags !== undefined) {
    await prisma.assetTag.deleteMany({ where: { assetId: id } });
    data.tags = { create: buildTagConnections(input.tags) };
  }

  const updated = await prisma.asset.update({ where: { id }, data });

  return mapAsset(updated);
}

async function setStatus(id: string, userId: string, status: AssetStatus): Promise<Asset> {
  const asset = await prisma.asset.findUnique({ where: { id } });

  if (!asset) {
    throw httpError("Asset not found", 404, "NOT_FOUND");
  }

  await assertOwnerOrAdmin(asset, userId);

  const updated = await prisma.asset.update({ where: { id }, data: { status } });

  return mapAsset(updated);
}

export async function publish(id: string, userId: string): Promise<Asset> {
  return setStatus(id, userId, "published");
}

export async function archive(id: string, userId: string): Promise<Asset> {
  return setStatus(id, userId, "archived");
}

export async function remove(id: string, userId: string): Promise<void> {
  const asset = await prisma.asset.findUnique({ where: { id } });

  if (!asset) {
    throw httpError("Asset not found", 404, "NOT_FOUND");
  }

  await assertOwnerOrAdmin(asset, userId);

  await prisma.asset.delete({ where: { id } });
}
