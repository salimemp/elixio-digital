# Architecture

> TypeScript monorepo with three deployable apps (web, mobile, API) and one shared package. Vercel for web, Railway for API + Postgres, S3-compatible storage (R2), and security-first defaults throughout.

---

## Overview

```
┌───────────────┐   ┌───────────────┐        ┌──────────────────────────┐
│  Next.js Web  │   │  Expo Mobile  │  ──►   │  Node.js + Fastify API   │
│  (SSR/SSG)    │   │  (iOS/Android)│        │  REST + Prisma ORM       │
└───────────────┘   └───────────────┘        └───────────┬──────────────┘
        │                                             │
        └────────────── @elixio/shared ───────────────┘
            (types, Zod schemas, constants)
```

- **Web hosting**: Vercel (Next.js 14 App Router). NOT Cloudflare Pages (see [`docs/PHASE-2-UPGRADE.md`](./PHASE-2-UPGRADE.md) for why we switched).
- **API hosting**: Railway (Fastify + managed Postgres).
- **Mobile builds**: EAS Build (Expo Application Services). Free for dev, $99/mo production.
- **DNS + CDN + DDoS**: Cloudflare (proxy + R2 for asset storage).
- **Database**: Railway-managed Postgres (single instance, US region, daily backups).
- **Auth tokens**: bcrypt(12) + JWT access (15 min) + refresh (7 day, rotating).
- **Encryption**: AES-256-GCM for TOTP secrets + OAuth tokens (key in env, separate from DB).
- **Email**: Resend (free tier ≤ 3k/mo, retry 3x with backoff).
- **AI features**: Google Gemini 1.5 Flash (default) + Pro fallback.
- **Background jobs**: In-process retry queue (3 attempts, 1s/4s/16s backoff). BullMQ + Redis deferred to Phase 2 (see [SECURITY](./SECURITY.md) + [PHASE-2-UPGRADE](./PHASE-2-UPGRADE.md)).
- **i18n**: 42 locales (9 priority + 4 CJK + 29 scaffolded). Cookie-based locale resolution.
- **Theme**: 3 modes × 4 brand palettes = 12 combinations, WCAG AA compliant.
- **Tax**: 127 rates across 41 countries, marketplace-facilitator-collected where required.
- **Scanning**: Weekly CodeQL + dependency audits via `pnpm audit`.

## Apps

### `apps/web` — Next.js 14 (App Router)

- **Server Components by default** for SEO + performance.
- **Route groups**:
  - `(marketing)` — landing pages, /about, /privacy, /terms, /cookies
  - `(marketplace)` — /explore, /asset/[id], /creator/[slug]
  - `(dashboard)` — /dashboard, /studio, /dashboard/bulk
  - `(auth)` — /auth/login, /auth/register, /auth/mfa-verify
- **Tailwind CSS** for styling with **theme tokens** (bg-gum-cream, ink-default, etc.) that flip with mode.
- **Calls the API** via a typed client at `apps/web/src/lib/`.
- **Hosting: Vercel** (deployed via `vercel deploy --prod`).

### `apps/mobile` — Expo (React Native) + Expo Router

- File-based routing mirroring web where sensible.
- **React 19.2.3** (intent) but currently installs as 18.3.1 via `pnpm.overrides` (root forces 18 because Next 14 doesn't support React 19 — see [PHASE-2-UPGRADE](./PHASE-2-UPGRADE.md)).
- Shares types and Zod schemas with web via `@elixio/shared`.
- Build/distribution via EAS.
- **Mobile focuses on browse → buy → download** in MVP. Creator creation tools stay web-first.

### `apps/api` — Node.js + Fastify

- REST API (no versioning prefix — `POST /tax/calculate` not `/v1/tax/calculate`).
- Prisma ORM against PostgreSQL. Single source of truth for the data model.
- **35 Prisma models** + 7 migrations as of 28 June 2026.
- **Layered structure**:
  - `src/routes/` — HTTP handlers (thin, just Zod parse + service call + response).
  - `src/services/` — business logic.
  - `src/plugins/` — Fastify plugins (auth, rate-limit, error handling, security headers).
  - `src/lib/` — utilities (prisma, jwt, bcrypt, hmac, geoip, password-security, rate-limit).
  - `src/config/` — env loading + validation.
- **Validation**: Zod schemas imported from `@elixio/shared` for request/response contracts.
- **Security**: helmet (HSTS 2yr + strict CSP), @fastify/rate-limit (2000/min/IP), DB-backed sliding window per action.
- **Hosting: Railway** (Docker deploy with managed Postgres, single instance).

## `packages/shared`

- `types/` — domain TypeScript types & enums.
- `schemas/` — Zod validation schemas (used by all apps).
- `constants/` — categories, pricing config, license definitions.
- **No runtime dependencies on Node or React** — pure, tree-shakable logic.

## Cross-cutting concerns

### Authentication

- **Email/password** → bcrypt (cost 12).
- **JWT access token** (15 min) + rotating refresh token (7 day, sliding).
- **Web**: refresh token in httpOnly, secure, sameSite=strict cookie.
- **Mobile**: refresh token in secure storage (expo-secure-store).
- **MFA TOTP** (`pyotp` server, `qr_flutter` client) with 10 backup codes (rejection-sampled for unbiased entropy).
- **WebAuthn / passkeys** via `@simplewebauthn/server`.
- **OAuth** (Google, GitHub) via `arctic`.
- **Magic link** sign-in (15 min single-use).
- **Password reset** (1 hr single-use).
- **Email verification** (24 hr, non-fatal).

See [`docs/SECURITY.md`](./SECURITY.md) for the full flow.

### Authorization (defense in depth)

- Role-based: `buyer`, `creator`, `admin` (a user can hold buyer + creator simultaneously).
- `requireBuyer` / `requireCreator` / `requireAdmin` Fastify decorators.
- **`requireBuyer` and `requireCreator` re-check the DB** — JWT claims can be stale if role was changed after the token was issued. The DB re-check closes that gap within the access token's 15-minute TTL.
- `requireAdmin` uses JWT claim only (admins don't get downgraded often).

### Payments (planned)

- **MVP**: Stripe Checkout for one-time payments; platform collects funds.
- **V1**: Stripe Connect (Express accounts) for direct creator payouts and split payments.
- **Webhooks** (`stripe.webhook`) update order status idempotently.
- **Tax collection**: marketplace facilitator collects in jurisdictions that require it (EU OSS, UK, India, GCC, Japan, etc.).

### File storage & delivery

- **Storage**: Cloudflare R2 (zero-egress, S3-compatible).
- **Upload flow**: API issues a presigned POST → client uploads directly to storage → API records the asset file.
- **Delivery**: purchased files served via signed GET URLs, time-limited (15 min), generated from `DownloadGrant` records.

### Search

- **MVP**: PostgreSQL full-text search (`tsvector`, GIN index) + trigram for typo tolerance.
- **V1**: migrate to Meilisearch or Typesense for relevance + faceting, synced via DB events/jobs.

### Background jobs

- **Now (MVP)**: In-process retry queue with exponential backoff (3 attempts: 1s/4s/16s). Used for transactional email send-and-forget.
- **V1**: BullMQ + Upstash Redis for durable queue + DLQ. Required when payment processing lands (real money flows need durable retry). See [PHASE-2-UPGRADE](./PHASE-2-UPGRADE.md).

### Caching

- **CDN**: Cloudflare caches static assets + HTML at the edge.
- **API**: no in-memory cache yet (queries are fast enough — p95 < 100ms for cached reads).
- **Browser**: localStorage for theme + locale + cookie consent.

### Monitoring + observability

- **Logs**: stdout (Railway captures); structured JSON for registration events (logs/creators.log, logs/buyers.log, logs/registrations.log).
- **Errors**: console.error + structured log lines. Sentry is **not** yet wired (Roadmap §M2).
- **Alerts**: new-location login emails (fire-and-forget). Rate-limit exceptions logged for admin review.

## Data flow example — purchase (planned)

1. Buyer clicks "Buy now" → API creates an `Order` (pending) + Stripe Checkout Session.
2. Buyer pays on Stripe → Stripe sends `checkout.session.completed` webhook.
3. API verifies signature, marks `Order` paid, creates `DownloadGrant`(s), enqueues sale-notification email.
4. Buyer fetches download → API validates grant, returns signed URL.
5. Creator balance credited (platform fee deducted); payout scheduled (V1 via Stripe Connect).

## Environments

- `local` — `pnpm dev` runs all three apps + Postgres + Redis via `docker compose up` (planned).
- `production` — managed Postgres on Railway, Vercel for web, EAS for mobile.
- `staging` — TBD; currently using main directly with feature-flag protection on risky changes.

## Non-functional targets

- **API p95 < 300ms** (uncached reads). Current measured: ~150ms for `/tax/calculate`, ~200ms for `/auth/login`.
- **Web LCP < 2.5s**; INP < 200ms.
- **99.9% uptime** for API.
- **Horizontal scaling**: API stateless behind load balancer. Single Postgres instance is the only stateful piece; would need read-replica or sharding at 10k+ RPS.

## Reference

- Plan: [`docs/PLAN.md`](./PLAN.md)
- Roadmap: [`docs/ROADMAP.md`](./ROADMAP.md)
- Database schema: [`docs/DATABASE.md`](./DATABASE.md)
- API spec: [`docs/API.md`](./API.md)
- Tax: [`docs/TAX.md`](./TAX.md)
- Security: [`docs/SECURITY.md`](./SECURITY.md)
- i18n: [`docs/I18N.md`](./I18N.md)
- Theme: [`docs/THEME.md`](./THEME.md)
- Legal: [`docs/LEGAL.md`](./LEGAL.md)
- Testing: [`docs/TESTING.md`](./TESTING.md)
- Deploy: [`docs/DEPLOY.md`](./DEPLOY.md)
- Brand: [`docs/BRAND.md`](./BRAND.md)
- Phase 2 upgrade plan: [`docs/PHASE-2-UPGRADE.md`](./PHASE-2-UPGRADE.md)
- Secrets: [`docs/SECRETS.md`](./SECRETS.md)