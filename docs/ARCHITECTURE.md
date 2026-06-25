# Architecture

## Overview

Elixio Digital is a TypeScript monorepo with three deployable apps and one shared package, orchestrated by pnpm workspaces + Turborepo.

```
┌───────────────┐   ┌───────────────┐        ┌──────────────────────────┐
│  Next.js Web  │   │  Expo Mobile  │  ──►   │  Node.js + Fastify API   │
│  (SSR/SSG)    │   │  (iOS/Android)│        │  REST + Prisma ORM       │
└───────────────┘   └───────────────┘        └───────────┬──────────────┘
        │                                             │
        └────────────── @elixio/shared ───────────────┘
            (types, Zod schemas, constants)
```

## Apps

### `apps/web` — Next.js 14 (App Router)
- Server Components by default for SEO and performance.
- Route groups: `(marketing)` for landing pages, `(marketplace)` for browse/buy, `(dashboard)` for creator tools, `(auth)` for login/register, `(admin)` for moderation.
- Tailwind CSS for styling; shared design tokens.
- Calls the API via a typed client. Public read routes can be SSR'd for SEO.
- **Hosting: Cloudflare Pages** (built with `@cloudflare/next-on-pages`).

### `apps/mobile` — Expo (React Native) + Expo Router
- File-based routing mirroring web where sensible: `explore`, `asset/[id]`, `creator/[id]`, `library`, `profile`.
- Shares types and Zod schemas with web via `@elixio/shared`.
- Build/distribution via EAS (Expo Application Services).
- Mobile focuses on **browse → buy → download** and notifications in MVP. Creator creation tools stay web-first in MVP.

### `apps/api` — Node.js + Fastify
- REST API (JSON). Versioned under `/v1`.
- Prisma ORM against PostgreSQL. Single source of truth for the data model.
- Layered structure:
  - `src/routes/` — HTTP handlers (thin).
  - `src/services/` — business logic.
  - `src/repositories/` — Prisma data access (optional abstraction).
  - `src/plugins/` — Fastify plugins (auth, rate-limit, error handling).
  - `src/config/` — env loading, validation.
- Validation: Zod schemas imported from `@elixio/shared` for request/response contracts.
- **Hosting: Railway** (Docker deploy with managed PostgreSQL).

## `packages/shared`
- `types/` — domain TypeScript types & enums.
- `schemas/` — Zod validation schemas (used by all apps).
- `constants/` — categories, pricing config, license definitions.
- No runtime dependencies on Node or React — pure, tree-shakable logic.

## Cross-cutting concerns

### Authentication
- Email/password → bcrypt (cost 12).
- JWT access token (15 min) + rotating refresh token (30 days).
- Web: refresh token in httpOnly, secure, sameSite=strict cookie.
- Mobile: refresh token in secure storage (expo-secure-store).
- Optional OAuth (Google/Apple/GitHub) in V1.
- Auth plugin decorates Fastify request with `request.user`.

### Authorization
- Role-based: `buyer`, `creator`, `admin` (a user can hold buyer + creator).
- Resource ownership checks (e.g., only asset owner can edit).

### Payments
- MVP: Stripe Checkout for one-time payments; platform collects funds.
- V1: Stripe Connect (Express accounts) for direct creator payouts and split payments.
- Webhooks (`stripe.webhook`) update order status idempotently.

### File storage & delivery
- S3-compatible object storage (e.g., R2, S3, B2).
- Upload flow: API issues a **presigned POST** → client uploads directly to storage → API records the asset file.
- Delivery: purchased files served via **signed GET URLs**, time-limited (e.g., 15 min), generated from `DownloadGrant` records.

### Search
- MVP: PostgreSQL full-text search (`tsvector`, GIN index) + trigram for typo tolerance.
- V1: migrate to Meilisearch or Typesense for relevance and faceting, synced via DB events/jobs.

### Background jobs (V1)
- BullMQ + Redis for: transactional email, payout processing, file processing (thumbnails, virus scan), search reindexing.

### Caching
- CDN for all media and static assets.
- API: short-lived in-memory or Redis cache for hot read paths (categories, featured assets).

## Data flow example — purchase
1. Buyer clicks "Buy now" → API creates an `Order` (pending) + Stripe Checkout Session.
2. Buyer pays on Stripe → Stripe sends `checkout.session.completed` webhook.
3. API verifies signature, marks `Order` paid, creates `DownloadGrant`(s), enqueues sale-notification email.
4. Buyer fetches download → API validates grant, returns signed URL.
5. Creator balance credited (platform fee deducted); payout scheduled (V1 via Stripe Connect).

## Environments
- `local` — Docker Compose for Postgres + Redis (optional).
- `staging` — mirror of prod, seeded data.
- `production` — managed Postgres, object storage, CDN.

## Non-functional targets
- API p95 < 300ms (cached reads < 100ms).
- Web LCP < 2.5s; INP < 200ms.
- 99.9% uptime for API.
- Horizontal scaling: API stateless behind load balancer.
