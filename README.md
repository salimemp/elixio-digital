# Elixio Digital

A cross-platform marketplace where creators **showcase**, **market**, and **sell** digital assets to prospective buyers — built as a TypeScript monorepo spanning web, mobile, and API.

> Status: **MVP / V1 transition** (28 June 2026). Web app live at [elixiodigital.com](https://elixiodigital.com). API live at [api.elixiodigital.com](https://api.elixiodigital.com). Mobile app in scaffold. Stripe payment integration is the remaining blocker for full MVP.
>
> See [`docs/ROADMAP.md`](./docs/ROADMAP.md) for what's done and what's next.

---

## What is Elixio Digital?

Elixio Digital is a creator-first digital asset marketplace. Creators publish digital goods (templates, design files, ebooks, courses, music, code, 3D assets, photography), build a storefront, market their work, and sell directly to buyers. Buyers discover, preview, purchase, and download licensed assets.

**Differentiation**: creator-first, playful "gum" brand identity, 42-locale i18n at launch (with native support for Chinese, Japanese, Korean, Spanish, French, German, Hindi, Portuguese, Arabic, Urdu, Hebrew), 127 tax rates across 41 countries, voice-first accessibility.

---

## Monorepo structure

```
elixio-digital/
├── apps/
│   ├── web/        # Next.js 14 (App Router) — marketing site + web marketplace [LIVE]
│   ├── mobile/     # Expo SDK 56 (React Native) — iOS/Android app [SCAFFOLDED]
│   └── api/        # Node.js + Fastify REST API + Prisma (PostgreSQL) [LIVE]
├── packages/
│   └── shared/     # Shared TypeScript types, Zod schemas, constants
├── docs/           # Plan, architecture, DB schema, API spec, i18n, tax, security, theme, legal, testing
├── .github/workflows/  # CI (lint/typecheck/build) + CodeQL (weekly)
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Tech stack

| Layer        | Technology                                                              |
| ------------ | ----------------------------------------------------------------------- |
| Web          | Next.js 14 (App Router), React 18, Tailwind CSS, isomorphic-dompurify    |
| Mobile       | Expo SDK 56, React Native 0.85, Expo Router (scaffold, not shipped)    |
| API          | Node.js 24, Fastify 4, Prisma 5, TypeScript                            |
| Database     | PostgreSQL (Railway-managed, US region)                                 |
| Auth         | JWT access (15min) + refresh (7d), bcrypt(12), MFA TOTP, WebAuthn, OAuth |
| Email        | Resend (free ≤ 3k/mo) with retry-with-backoff                            |
| AI           | Google Gemini 1.5 Flash (default) + Pro fallback                        |
| Payments     | Stripe Connect (planned V1)                                            |
| Storage      | Cloudflare R2 (zero-egress, S3-compatible, planned integration)          |
| Search       | PostgreSQL full-text (MVP) → Meilisearch (V1)                            |
| i18n         | 42 locales, cookie-based, 9 priority + 4 CJK native translations        |
| Theme        | 3 modes × 4 brand palettes, WCAG AA across all 23 pages                |
| Tax          | 127 rates across 41 countries, marketplace-facilitator-collected      |
| Monorepo     | pnpm 10.15.0 + Turborepo 2.x                                           |
| Hosting      | **Vercel** (web, not Cloudflare Pages — see PHASE-2-UPGRADE.md), Railway (API + PostgreSQL), EAS (mobile) |
| Scanning     | GitHub Actions CI (lint/typecheck/build), CodeQL weekly (security-and-quality) |

---

## Prerequisites

- Node.js >= 24 (see `.nvmrc`)
- pnpm 10.15.0 (`npm i -g pnpm@10.15.0`)
- PostgreSQL >= 14 (local or hosted; we use Railway)
- (Optional) Expo Go app for mobile development

---

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
#   fill in DATABASE_URL, JWT_SECRET, ELIXIO_MFA_KEY_ENCRYPTION_KEY

# 3. Set up the database
pnpm db:generate
pnpm db:migrate

# 4. Seed tax rates (admin only)
ADMIN_ACCESS_TOKEN=$(pnpm --filter @elixio/api exec tsx scripts/bootstrap-admin.ts)
curl -X POST "http://localhost:3000/v1/tax/seed" -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN"

# 5. Run everything (web + mobile + api)
pnpm dev

# Or run individually
pnpm dev:web
pnpm dev:mobile
pnpm dev:api
```

---

## Common commands

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `pnpm dev`        | Start all apps in dev mode           |
| `pnpm build`      | Build all packages/apps              |
| `pnpm lint`       | Lint everything                      |
| `pnpm typecheck`  | Type-check everything                |
| `pnpm test`       | Run all 118 tests                    |
| `pnpm db:generate`| Generate Prisma client               |
| `pnpm db:migrate` | Run Prisma migrations                |
| `pnpm db:studio`  | Open Prisma Studio                   |

## Deployment

| App    | Target                              | Notes                                                                  |
| ------ | ----------------------------------- | ---------------------------------------------------------------------- |
| Web    | **Vercel** (not Cloudflare Pages)   | `vercel deploy --prod --yes --scope abduls-projects-551a11d6`        |
| API    | Railway (Docker + Postgres)         | `railway up --service elixio-api`                                       |
| Mobile | EAS / Expo                          | Planned for V1                                                         |

Live URLs:

- Web: https://elixiodigital.com
- API: https://api.elixiodigital.com

See [`docs/DEPLOY.md`](./docs/DEPLOY.md) for full deployment runbook.

---

## Creator & buyer separation

The UI and API keep creator and buyer concerns distinct at every layer:

- **Buyer routes**: `/explore`, `/asset/:id`, `/library`, `/dashboard/bulk` (mass downloads), `/downloads/:id`.
- **Creator routes**: `/dashboard`, `/studio` (AI tools), `/creator/:slug`, `/sell`.
- **API routes**: `/v1/auth/*`, `/v1/assets/*`, `/v1/creator/*`, `/v1/downloads/*`.
- **Role guards** (`requireBuyer` / `requireCreator` / `requireAdmin` in [`apps/api/src/plugins/auth.ts`](./apps/api/src/plugins/auth.ts)) enforce access.
- **Defense in depth**: the buyer/creator guards re-check the DB row (not just the JWT claim) so a role change takes effect within 15 minutes (when the access token expires).

The web app separates the two journeys in the navbar ("BUYER" + "CREATOR" pills, each with their own action buttons). The mobile app will mirror this via profile sections.

---

## Testing

**118 tests** across:

- API: password security (30), tax (37), role guards (18), server smoke (1) = 86
- Web: HTML sanitization (19), i18n formatting (13) = 32

Focus: security and money paths. UI tests are visual via Playwright. See [`docs/TESTING.md`](./docs/TESTING.md).

---

## Documentation

| Topic | Doc |
| --- | --- |
| High-level plan | [`docs/PLAN.md`](./docs/PLAN.md) |
| Roadmap (Phase 0/1/2/3) | [`docs/ROADMAP.md`](./docs/ROADMAP.md) |
| Architecture | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| Database schema (35 models) | [`docs/DATABASE.md`](./docs/DATABASE.md) |
| API specification | [`docs/API.md`](./docs/API.md) |
| Tax (127 rates, 41 countries) | [`docs/TAX.md`](./docs/TAX.md) |
| i18n (42 locales) | [`docs/I18N.md`](./docs/I18N.md) |
| Theme system | [`docs/THEME.md`](./docs/THEME.md) |
| Legal pages + compliance | [`docs/LEGAL.md`](./docs/LEGAL.md) |
| Security practices | [`docs/SECURITY.md`](./docs/SECURITY.md) |
| Testing strategy | [`docs/TESTING.md`](./docs/TESTING.md) |
| Brand + palettes | [`docs/BRAND.md`](./docs/BRAND.md) |
| Deploy runbook | [`docs/DEPLOY.md`](./docs/DEPLOY.md) |
| Secrets management | [`docs/SECRETS.md`](./docs/SECRETS.md) |
| Phase 2 upgrade plan | [`docs/PHASE-2-UPGRADE.md`](./docs/PHASE-2-UPGRADE.md) |

---

## License

Proprietary — © Elixio Digital. All rights reserved.