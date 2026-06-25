# Database Schema

PostgreSQL is the sole primary datastore, accessed exclusively through Prisma ORM (`apps/api/prisma/schema.prisma`). This document describes the entities, relationships, and key indexes.

## Entity Relationship Summary

```
User 1──1 Storefront
User 1──* Asset (creator)
Asset 1──* AssetFile
Asset 1──* AssetMedia
Asset *──* Tag
Asset *──1 Category
Asset 1──* Review
Asset 1──* OrderItem
Order 1──* OrderItem
Order 1──* DownloadGrant
OrderItem 1──* DownloadGrant
User 1──* Order (buyer)
User 1──* Payout (creator)
User 1──* DiscountCode (creator-owned)
Collection *──* Asset
```

## Core Tables

### User
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| email | string | unique, lowercased |
| passwordHash | string | bcrypt |
| role | enum | `buyer`, `creator`, `admin` (multi via flags) |
| displayName | string | |
| avatarUrl | string? | |
| bio | text? | |
| isCreator | boolean | can publish assets |
| isVerified | boolean | KYC badge (P1) |
| createdAt / updatedAt | timestamp | |

### Storefront (1:1 with creator User)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| userId | UUID (FK, unique) | |
| slug | string | unique, vanity URL |
| bannerUrl | string? | |
| accentColor | string? | |
| socialLinks | jsonb | {website, twitter, instagram, ...} |
| stripeConnectAccountId | string? | (P1) |

### Asset
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| creatorId | UUID (FK → User) | |
| title | string | |
| slug | string | unique |
| description | text | |
| categoryId | UUID (FK) | |
| priceCents | integer | stored in cents (integer math) |
| currency | string | ISO 4217, e.g. "USD" |
| licenseId | UUID (FK) | |
| status | enum | `draft`, `published`, `archived`, `rejected` |
| searchVector | tsvector | generated column for FTS |
| avgRating | numeric? | denormalized, updated on review |
| reviewCount | integer | denormalized |
| salesCount | integer | denormalized |
| createdAt / updatedAt | timestamp | |

### AssetFile (deliverable)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| assetId | UUID (FK) | |
| storageKey | string | object storage key |
| filename | string | original name |
| mimeType | string | |
| sizeBytes | bigint | |
| version | integer | file version (P1) |

### AssetMedia (preview)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| assetId | UUID (FK) | |
| storageKey | string | |
| kind | enum | `image`, `video` |
| position | integer | display order |

### Category
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| name | string | unique |
| slug | string | unique |
| parentId | UUID? | nullable for subcategories |

### Tag
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| name | string | unique, lowercased |

### License
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| code | enum | `personal`, `commercial`, `extended` |
| name | string | |
| summary | text | human-readable |

### Order
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| buyerId | UUID (FK → User) | |
| status | enum | `pending`, `paid`, `refunded`, `failed` |
| subtotalCents | integer | |
| platformFeeCents | integer | |
| totalCents | integer | |
| currency | string | |
| stripePaymentIntentId | string? | |
| createdAt | timestamp | |

### OrderItem
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| orderId | UUID (FK) | |
| assetId | UUID (FK) | |
| priceCents | integer | snapshot at purchase |
| creatorId | UUID (FK) | for payout attribution |
| licenseCode | enum | snapshot |

### DownloadGrant
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| orderItemId | UUID (FK) | |
| buyerId | UUID (FK) | |
| expiresAt | timestamp | grant lifetime |
| downloadCount | integer | |
| maxDownloads | integer | abuse prevention |

### Review
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| assetId | UUID (FK) | |
| userId | UUID (FK → buyer) | verified buyer only |
| rating | integer | 1–5 |
| comment | text? | |
| createdAt | timestamp | |

### Payout
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| creatorId | UUID (FK) | |
| amountCents | integer | |
| currency | string | |
| status | enum | `scheduled`, `processing`, `paid`, `failed` |
| stripeTransferId | string? | |

### DiscountCode
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| creatorId | UUID (FK) | who owns it |
| code | string | unique per creator |
| percentOff | integer | 0–100 |
| maxRedemptions | integer? | |
| expiresAt | timestamp? | |

### Collection
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| title | string | |
| slug | string | unique |
| isFeatured | boolean | |
| curatorId | UUID (FK → User/admin) | |

### CollectionAsset (join)
| Field | Type | Notes |
| --- | --- | --- |
| collectionId | UUID (FK) | |
| assetId | UUID (FK) | |
| position | integer | |

## Key Indexes
- `Asset(creatorId)`, `Asset(categoryId)`, `Asset(status)`, `Asset(slug)` unique.
- `Asset(searchVector)` GIN index for full-text search.
- `Tag(name)` trigram (`pg_trgm`) for typo-tolerant search.
- `Order(buyerId, createdAt)`, `OrderItem(creatorId)` for payout/sales queries.
- `Review(assetId)` composite with `userId` unique (one review per buyer per asset).
- `DownloadGrant(buyerId, expiresAt)` for cleanup/validation.

## Conventions
- All monetary values stored as **integer cents** — never floats.
- UUIDs for all primary keys.
- `createdAt`/`updatedAt` on mutable entities.
- Soft-delete where audit matters (assets archived, not hard-deleted).
- Denormalized counters (`salesCount`, `avgRating`) updated in transactions/jobs.
