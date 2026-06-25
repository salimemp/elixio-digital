# API Specification

REST API served by `apps/api` (Fastify). Base path: `/api/v1`. All request/response bodies are JSON. All request bodies validated with Zod schemas from `@elixio/shared`.

## Conventions
- **Auth:** Bearer JWT (`Authorization: Bearer <accessToken>`). Refresh via `POST /auth/refresh`.
- **Errors:** uniform shape.
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
  ```
- **Pagination:** `?page=1&limit=20` → `{ items, page, limit, total, hasMore }`.
- **IDs:** UUIDs (string).
- **Money:** integer cents in responses.

## Status codes
- 200 OK · 201 Created · 204 No Content
- 400 Bad Request (validation) · 401 Unauthorized · 403 Forbidden · 404 Not Found
- 409 Conflict (duplicate) · 429 Too Many Requests · 500 Internal

---

## Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | – | Create account (email, password, name) |
| POST | `/auth/login` | – | Email + password → tokens |
| POST | `/auth/refresh` | refresh cookie/token | Rotate refresh, issue access |
| POST | `/auth/logout` | user | Revoke refresh token |
| GET | `/auth/me` | user | Current user profile |
| POST | `/auth/change-password` | user | Change password |
| POST | `/auth/oauth/:provider` | – | (P1) OAuth callback exchange |

## Users & Storefronts

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/users/:id` | – | Public profile |
| PATCH | `/users/me` | user | Update profile |
| POST | `/users/me/become-creator` | user | Activate creator role + create storefront |
| GET | `/storefronts/:slug` | – | Public storefront + assets |
| PATCH | `/storefronts/me` | creator | Update storefront |
| POST | `/storefronts/me/onboarding` | creator | (P1) Stripe Connect onboarding |

## Assets

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/assets` | – | Search/list (`q`, `category`, `tag`, `sort`, `minPrice`, `maxPrice`) |
| GET | `/assets/:id` | – | Asset detail (published only publicly) |
| POST | `/assets` | creator | Create asset (draft) |
| PATCH | `/assets/:id` | owner | Update asset |
| POST | `/assets/:id/publish` | owner | Publish asset |
| POST | `/assets/:id/archive` | owner | Archive asset |
| DELETE | `/assets/:id` | owner | Delete (soft) |
| GET | `/assets/:id/media` | – | Preview media list |
| POST | `/assets/:id/files` | owner | Request presigned upload URL for deliverable |
| POST | `/assets/:id/media` | owner | Request presigned upload URL for preview media |

## Categories & Tags

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/categories` | – | Category tree |
| GET | `/tags?q=` | – | Tag autocomplete |

## Cart & Checkout

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/cart` | user | Current cart |
| POST | `/cart/items` | user | Add asset to cart |
| DELETE | `/cart/items/:itemId` | user | Remove item |
| POST | `/checkout` | user | Create Stripe Checkout Session for cart |
| POST | `/webhooks/stripe` | – | Stripe webhook (signature verified) |

## Orders & Downloads

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/orders` | user | Buyer's order history |
| GET | `/orders/:id` | owner | Order detail |
| POST | `/orders/:id/items/:itemId/download` | owner | Get signed download URL (validates grant) |

## Reviews

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/assets/:id/reviews` | – | Reviews list |
| POST | `/assets/:id/reviews` | buyer | Create review (verified buyer only) |
| DELETE | `/reviews/:id` | owner | Delete own review |

## Creator Dashboard

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/creator/stats` | creator | Overview (revenue, orders, top assets) |
| GET | `/creator/sales` | creator | Sales list |
| GET | `/creator/payouts` | creator | Payout history |
| GET | `/creator/analytics` | creator | (P1) Views/conversion analytics |

## Marketing (P1)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/discount-codes` | creator | Create discount code |
| GET | `/discount-codes` | creator | List own codes |
| GET | `/collections` | – | Curated collections |
| GET | `/collections/:slug` | – | Collection detail |

## Library & Wishlist

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/library` | user | Purchased assets |
| POST | `/wishlist/:assetId` | user | Add to wishlist |
| DELETE | `/wishlist/:assetId` | user | Remove from wishlist |
| GET | `/wishlist` | user | Wishlist |

## Admin

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/admin/assets?status=` | admin | Moderation queue |
| POST | `/admin/assets/:id/moderate` | admin | Approve/reject |
| GET | `/admin/users` | admin | User management |
| POST | `/admin/users/:id/ban` | admin | Ban user |
| POST | `/admin/refunds/:orderId` | admin | Issue refund |

## Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | – | Liveness |
| GET | `/ready` | – | Readiness (DB ping) |

---

## Example: Create asset
`POST /api/v1/assets`
```json
{
  "title": "Aurora UI Kit",
  "description": "120+ components ...",
  "categoryId": "uuid",
  "tags": ["figma", "ui-kit"],
  "priceCents": 4900,
  "currency": "USD",
  "licenseCode": "commercial"
}
```
Response `201`:
```json
{ "id": "uuid", "status": "draft", "slug": "aurora-ui-kit", ... }
```

## Example: Search
`GET /api/v1/assets?q=ui+kit&category=design&sort=popular&page=1&limit=20`

## Rate limits
- Anonymous: 60 req/min/IP.
- Authenticated: 300 req/min/user.
- Auth/checkout endpoints: stricter (10 req/min).
