# Elixio Digital

A cross-platform marketplace where creators **showcase**, **market**, and **sell** digital assets to prospective buyers — built as a TypeScript monorepo spanning web, mobile, and API.

> Status: **Active development.** Monorepo scaffold is complete and all workspace packages pass `pnpm typecheck` and `pnpm lint`. Core backend routes (auth, assets, users, storefronts, categories), the Next.js web app, and the Expo mobile app are scaffolded. See [`docs/ROADMAP.md`](./docs/ROADMAP.md) for remaining MVP work.

---

## What is Elixio Digital?

Elixio Digital is a creator-first digital asset marketplace. Creators publish digital goods (templates, design files, ebooks, courses, music, code, 3D assets, photography, and more), build a storefront, market their work, and sell directly to buyers. Buyers discover, preview, purchase, and download licensed assets.

See the full plan: **[`docs/PLAN.md`](./docs/PLAN.md)**

---

## Monorepo structure

```
elixio-digital/
├── apps/
│   ├── web/        # Next.js 14 (App Router) — marketing site + web marketplace
│   ├── mobile/     # Expo (React Native) — iOS/Android app (Expo Router)
│   └── api/        # Node.js + Fastify REST API + Prisma (PostgreSQL)
├── packages/
│   └── shared/     # Shared TypeScript types, Zod schemas, constants
├── docs/           # Plan, architecture, DB schema, API spec, roadmap
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Tech stack

| Layer        | Technology                                                              |
| ------------ | ----------------------------------------------------------------------- |
| Web          | Next.js 14 (App Router), React, Tailwind CSS                            |
| Mobile       | Expo SDK 56, React Native 0.85, Expo Router                             |
| API          | Node.js 24, Fastify, TypeScript                                         |
| Database     | PostgreSQL + Prisma ORM                                                 |
| Auth         | JWT (access + refresh), bcrypt, optional OAuth                          |
| Payments     | Stripe Connect (creator payouts)                                        |
| Storage      | S3-compatible object storage (asset files + media)                      |
| Search       | PostgreSQL full-text (MVP) → Meilisearch/Typesense                      |
| Monorepo     | pnpm workspaces (10.15.0) + Turborepo                                   |
| Hosting      | Cloudflare Pages (web), Railway (API + PostgreSQL), EAS (mobile builds) |

---

## Prerequisites

- Node.js >= 24 (see `.nvmrc`)
- pnpm 10.15.0 (`npm i -g pnpm@10.15.0`)
- PostgreSQL >= 14 (local or hosted)
- Expo Go app (for mobile development)

---

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
#   fill in DATABASE_URL, JWT_SECRET, etc.

# 3. Set up the database
pnpm db:generate
pnpm db:migrate

# 4. Run everything (web + mobile + api)
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
| `pnpm test`       | Run all tests                        |
| `pnpm db:migrate` | Run Prisma migrations                |
| `pnpm db:studio`  | Open Prisma Studio                   |

## Deployment

| App    | Target                    | Notes                                                                  |
| ------ | ------------------------- | ---------------------------------------------------------------------- |
| Web    | Cloudflare Pages          | Build with `pnpm --filter @elixio/web pages:build`                     |
| API    | Railway (Docker + Postgres)| Deploy the `apps/api` Dockerfile; connect a managed PostgreSQL service |
| Mobile | EAS / Expo                | Build with `pnpm --filter @elixio/mobile build`                        |

---

## Creator & buyer separation

The UI and API keep creator and buyer concerns distinct:

- **Buyer routes**: explore, search, library, wishlist, cart, checkout, reviews.
- **Creator routes**: dashboard, asset management (`POST /assets`, storefront updates), payout history.
- **Role guards**: `requireCreator` and `requireAdmin` Fastify decorators enforce access.
- A buyer can become a creator via `POST /users/me/become-creator`.

The web app separates the two journeys in the navbar. The mobile app separates them via profile sections and (future) dedicated creator tabs.

---

## Documentation

- [Comprehensive Plan](./docs/PLAN.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Database Schema](./docs/DATABASE.md)
- [API Specification](./docs/API.md)
- [Roadmap](./docs/ROADMAP.md)

---

## License

Proprietary — © Elixio Digital. All rights reserved.
