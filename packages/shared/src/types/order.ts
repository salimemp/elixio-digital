import type { Asset } from "./asset";

export type OrderStatus = "pending" | "paid" | "refunded" | "failed";

export interface Order {
  id: string;
  buyerId: string;
  status: OrderStatus;
  subtotalCents: number;
  platformFeeCents: number;
  totalCents: number;
  currency: string;
  stripePaymentIntentId: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  assetId: string;
  priceCents: number;
  creatorId: string;
  licenseCode: "personal" | "commercial" | "extended";
}

export interface OrderDetail extends Order {
  items: (OrderItem & { asset: Pick<Asset, "id" | "title" | "slug"> });
}

export interface DownloadGrant {
  id: string;
  orderItemId: string;
  buyerId: string;
  expiresAt: string;
  downloadCount: number;
  maxDownloads: number;
}

export interface Review {
  id: string;
  assetId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface Payout {
  id: string;
  creatorId: string;
  amountCents: number;
  currency: string;
  status: "scheduled" | "processing" | "paid" | "failed";
  stripeTransferId: string | null;
}

export interface CartItem {
  id: string;
  assetId: string;
  addedAt: string;
  asset: Pick<Asset, "id" | "title" | "slug" | "priceCents" | "currency">;
}

export interface Cart {
  items: CartItem[];
  subtotalCents: number;
}
