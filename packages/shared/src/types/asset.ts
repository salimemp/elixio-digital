import type { User } from "./user.js";

export type AssetStatus = "draft" | "published" | "archived" | "rejected";

export interface Asset {
  id: string;
  creatorId: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  priceCents: number;
  currency: string;
  licenseId: string;
  status: AssetStatus;
  avgRating: number | null;
  reviewCount: number;
  salesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssetFile {
  id: string;
  assetId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
}

export interface AssetMedia {
  id: string;
  assetId: string;
  storageKey: string;
  kind: "image" | "video";
  position: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface Tag {
  id: string;
  name: string;
}

export interface License {
  id: string;
  code: "personal" | "commercial" | "extended";
  name: string;
  summary: string;
}

export interface AssetDetail extends Asset {
  creator: Pick<User, "id" | "displayName" | "avatarUrl">;
  category: Category;
  license: License;
  tags: Tag[];
  media: AssetMedia[];
  files: AssetFile[];
}

export interface Collection {
  id: string;
  title: string;
  slug: string;
  isFeatured: boolean;
  curatorId: string;
}

export interface DiscountCode {
  id: string;
  creatorId: string;
  code: string;
  percentOff: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
}
