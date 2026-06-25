import type {
  Asset as SharedAsset,
  AssetDetail as SharedAssetDetail,
  AssetFile as SharedAssetFile,
  AssetMedia as SharedAssetMedia,
  Category as SharedCategory,
  License as SharedLicense,
  Storefront as SharedStorefront,
  Tag as SharedTag,
  User as SharedUser,
} from "@elixio/shared";
import type {
  Asset as PrismaAsset,
  AssetFile as PrismaAssetFile,
  AssetMedia as PrismaAssetMedia,
  Category as PrismaCategory,
  License as PrismaLicense,
  Storefront as PrismaStorefront,
  Tag as PrismaTag,
  User as PrismaUser,
} from "@prisma/client";

export function mapUser(user: PrismaUser): SharedUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    isBuyer: user.isBuyer,
    isCreator: user.isCreator,
    isAdmin: user.role === "admin",
    isVerified: user.isVerified,
    emailVerified: user.emailVerifiedAt !== null,
    mfaEnabled: user.mfaEnabled,
    createdAt: user.createdAt.toISOString(),
  };
}

function mapSocialLinks(raw: unknown): SharedStorefront["socialLinks"] {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const obj = raw as Record<string, unknown>;
  const links: SharedStorefront["socialLinks"] = {};

  for (const key of ["website", "twitter", "instagram", "youtube", "github", "linkedin"] as const) {
    const value = obj[key];
    if (typeof value === "string") {
      links[key] = value;
    }
  }

  return links;
}

export function mapStorefront(storefront: PrismaStorefront): SharedStorefront {
  return {
    id: storefront.id,
    userId: storefront.userId,
    slug: storefront.slug,
    bannerUrl: storefront.bannerUrl,
    accentColor: storefront.accentColor,
    socialLinks: mapSocialLinks(storefront.socialLinks),
  };
}

export function mapCategory(category: PrismaCategory): SharedCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
  };
}

export function mapTag(tag: PrismaTag): SharedTag {
  return { id: tag.id, name: tag.name };
}

export function mapLicense(license: PrismaLicense): SharedLicense {
  return {
    id: license.id,
    code: license.code,
    name: license.name,
    summary: license.summary,
  };
}

export function mapMedia(media: PrismaAssetMedia): SharedAssetMedia {
  return {
    id: media.id,
    assetId: media.assetId,
    storageKey: media.storageKey,
    kind: media.kind,
    position: media.position,
  };
}

export function mapFile(file: PrismaAssetFile): SharedAssetFile {
  return {
    id: file.id,
    assetId: file.assetId,
    storageKey: file.storageKey,
    filename: file.filename,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    version: file.version,
  };
}

export function mapAsset(asset: PrismaAsset): SharedAsset {
  return {
    id: asset.id,
    creatorId: asset.creatorId,
    title: asset.title,
    slug: asset.slug,
    description: asset.description,
    categoryId: asset.categoryId,
    priceCents: asset.priceCents,
    currency: asset.currency,
    licenseId: asset.licenseId,
    status: asset.status,
    avgRating: asset.avgRating,
    reviewCount: asset.reviewCount,
    salesCount: asset.salesCount,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

function mapUserPick(user: PrismaUser): Pick<SharedUser, "id" | "displayName" | "avatarUrl"> {
  return { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl };
}

export function mapAssetDetail(
  asset: PrismaAsset & {
    creator: PrismaUser;
    category: PrismaCategory;
    license: PrismaLicense;
    tags: { tag: PrismaTag }[];
    media: PrismaAssetMedia[];
    files: PrismaAssetFile[];
  }
): SharedAssetDetail {
  return {
    ...mapAsset(asset),
    creator: mapUserPick(asset.creator),
    category: mapCategory(asset.category),
    license: mapLicense(asset.license),
    tags: asset.tags.map((assetTag) => mapTag(assetTag.tag)),
    media: asset.media.map(mapMedia),
    files: asset.files.map(mapFile),
  };
}
