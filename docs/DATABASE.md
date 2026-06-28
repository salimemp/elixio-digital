# Database Schema

PostgreSQL is the sole primary datastore, accessed exclusively through Prisma ORM (`apps/api/prisma/schema.prisma`). **35 models** across 7 migrations as of 28 June 2026. This document describes the entities, relationships, and key indexes.

## Entity Relationship Summary

```
User 1──1 Storefront
User 1──* Asset (creator)
User 1──* Order (buyer)
User 1──* Payout (creator)
User 1──* DiscountCode (creator-owned)
User 1──* RefreshToken
User 1──* MfaFactor
User 1──* MfaBackupCode
User 1──* OAuthAccount
User 1──* LoginAttempt
User 1──* AnalyticsSnapshot
User 1──* AIGeneration
User 1──* BulkOperation
Asset 1──* AssetFile
Asset 1──* AssetMedia
Asset 1──* AssetView (analytics)
Asset 1──* AssetDownload (analytics)
Asset 1──* Review
Asset 1──* OrderItem
Asset *──* Tag
Asset *──1 Category
Order 1──* OrderItem
Order 1──* DownloadGrant
Order 1──* TaxLineItem (snapshot)
Order 1──* TaxLineItem (snapshot, see TAX.md)
OrderItem 1──* DownloadGrant
Collection *──* Asset (via CollectionAsset)
DownloadGrant 1──* AssetDownload
AssetView, AssetDownload, AIGeneration, BulkOperation — all reference Asset and/or User for analytics + ops
```

Extended tables (auth, security, analytics, tax): see [Extended Tables](#extended-tables-added-2026) below.

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

## Extended Tables (added 2026)

### AssetView (creator analytics)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| assetId | UUID (FK → Asset) | |
| viewerId | UUID? (FK → User) | null for anonymous views |
| ip | string? | hashed (privacy) |
| userAgent | string? | |
| referrer | string? | |
| createdAt | timestamp | fire-and-forget insert on `GET /assets/:id` |

### AssetDownload (creator analytics)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| assetId | UUID (FK → Asset) | |
| grantId | UUID (FK → DownloadGrant) | |
| downloaderId | UUID (FK → User) | |
| ip | string? | hashed |
| userAgent | string? | |
| createdAt | timestamp | recorded on `POST /downloads/:id` |

### BulkOperation (creator bulk ops)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| creatorId | UUID (FK → User) | |
| operation | enum | `update_price`, `add_tag`, `remove_tag`, `archive`, `unarchive` |
| affectedAssetIds | UUID[] | |
| beforeJson | Json | snapshot for rollback |
| status | enum | `pending`, `in_progress`, `completed`, `rolled_back`, `failed` |
| createdAt / completedAt | timestamp | |

### AIGeneration (AI tools audit log)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| userId | UUID (FK → User) | |
| taskKind | enum | `listing_copywriter`, `asset_critique`, `sales_coach` |
| inputJson | Json | what the user submitted (text only) |
| outputJson | Json | what Gemini returned |
| modelUsed | string | e.g. `gemini-1.5-flash-8b` |
| tokensIn / tokensOut | int | |
| durationMs | int | |
| createdAt | timestamp | |

### AnalyticsSnapshot (cached rollups)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| creatorId | UUID (FK → User) | |
| period | enum | `day`, `week`, `month` |
| periodStart | timestamp | |
| totalRevenueCents | int | |
| totalOrders | int | |
| totalViews | int | |
| totalDownloads | int | |
| snapshotJson | Json | per-asset breakdown |

### RateLimitBucket (rate limiter)
| Field | Type | Notes |
| --- | --- | --- |
| key | string (PK) | composite: e.g. `login:email@example.com` |
| count | int | requests in current window |
| resetAt | timestamp | when the window resets |

Sliding window: each request checks if `(now - resetAt) > window_size`, if so resets to count=1, else increments.

### TaxRegion (tax rate catalog)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| country | string (ISO 3166-1 alpha-2) | e.g. `US`, `JP`, `CN` |
| region | string | empty for country-level, discriminator for multi-slab (e.g. `IN-GST-18`, `CN-VAT-13`) |
| kind | enum | `vat`, `gst`, `hst`, `qst`, `icms`, `pis_cofins`, `sales`, `consumption`, `none` |
| rate | Decimal(8, 6) | e.g. 0.180000 for 18% |
| currency | string (ISO 4217) | e.g. `ILS`, `USD`, `JPY` |
| label | string | human-readable |
| description | string? | what this rate covers |
| sourceUrl | string? | citation (tax authority page) |
| lastVerified | timestamp | when this rate was last verified |
| isActive | boolean | soft-delete via false |

Unique constraint: `(country, region, kind)`. 127 rows seeded from `apps/api/src/services/tax-rates.ts`.

### TaxLineItem (Order snapshot)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| orderId | UUID (FK → Order) | |
| kind | enum | matches TaxRegion.kind |
| label | string | snapshot of TaxRegion.label at order time |
| region | string? | |
| rate | Decimal(8, 6) | snapshot at order time |
| baseCents | int | |
| amountCents | int | snapshot — preserved even if rates change later |

### MfaFactor (MFA)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| userId | UUID (FK → User) | |
| type | enum | `totp`, `webauthn` |
| secret | string? | TOTP secret, AES-256-GCM encrypted |
| publicKey | string? | WebAuthn public key (plain) |
| credentialId | string? | WebAuthn credential ID |
| counter | int? | WebAuthn signature counter (replay protection) |
| createdAt / lastUsedAt | timestamp | |

### MfaBackupCode
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| userId | UUID (FK → User) | |
| codeHash | string | bcrypt-hashed 10-char code |
| usedAt | timestamp? | null until consumed |

### WebAuthnChallenge
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| userId | UUID (FK → User)? | null during registration ceremony |
| challenge | string | random nonce |
| type | enum | `registration`, `authentication` |
| expiresAt | timestamp | short TTL (~5 min) |
| consumedAt | timestamp? | |

### LoginAttempt (security audit)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| email | string | always logged, even if no user matches |
| userId | UUID? (FK → User) | null if email not found |
| ip | string? | |
| userAgent | string? | |
| geoCountry | string? | from ipapi.co (7-day cache) |
| geoCity | string? | |
| success | boolean | |
| failureReason | string? | `invalid_password`, `mfa_required`, `mfa_failed`, `rate_limited` |
| mfaRequired | boolean | |
| isNewLocation | boolean | triggered security email if true |
| createdAt | timestamp | indexed for time-range queries |

### RefreshToken (auth)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| userId | UUID (FK → User) | |
| tokenHash | string | bcrypt-hashed (defense against DB leak) |
| expiresAt | timestamp | 7 days from issue |
| revokedAt | timestamp? | rotation or explicit logout |
| createdAt | timestamp | |

### EmailVerification, PasswordResetToken, MagicLinkToken
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| userId | UUID (FK → User) | |
| tokenHash | string | bcrypt-hashed |
| expiresAt | timestamp | 24h / 1h / 15min |
| consumedAt | timestamp? | |

### OAuthAccount (OAuth provider link)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID (PK) | |
| userId | UUID (FK → User) | |
| provider | enum | `google`, `github` |
| providerAccountId | string | provider's user ID |
| accessToken | string? | AES-256-GCM encrypted |
| refreshToken | string? | AES-256-GCM encrypted |
| expiresAt | timestamp? | |

Unique constraint: `(provider, providerAccountId)`.

## Summary

- **35 Prisma models** total
- **7 migrations** as of 28 June 2026
- **127 TaxRegion rows** seeded from `tax-rates.ts`
- **42 i18n locales** in `apps/web/messages/` (see [I18N.md](./I18N.md))

