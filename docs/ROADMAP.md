# Roadmap

Phased delivery plan for Elixio Digital. Each phase builds on the previous. Items marked **P0** are MVP, **P1** is V1, **P2** is future.

---

## Phase 0 — Foundation (current)

**Goal:** Runnable monorepo with structure, config, plan, and placeholders.

- [x] Monorepo setup (pnpm + Turborepo + tsconfig)
- [x] Project structure (apps/web, apps/mobile, apps/api, packages/shared)
- [x] Comprehensive plan & architecture docs
- [x] Database schema (Prisma) draft
- [x] API route skeleton + OpenAPI-style spec
- [x] Placeholder web pages + mobile screens
- [x] Shared types, Zod schemas, constants

**Exit criteria:** `pnpm install` + `pnpm dev` boots all three apps (with placeholders); `pnpm typecheck` passes.

---

## Phase 1 — MVP (P0)

**Goal:** A creator can publish an asset; a buyer can discover, buy, and download it — end to end, on web + mobile.

### 1.1 Infrastructure
- [ ] Docker Compose for local Postgres
- [ ] CI (GitHub Actions): install, lint, typecheck, test, build
- [ ] Staging + prod environments
- [ ] Object storage bucket + presigned upload/download

### 1.2 Auth & Users
- [ ] Register / login (JWT access + refresh)
- [ ] Profile create/edit
- [ ] Role switching (buyer ↔ creator)
- [ ] Password reset (email)

### 1.3 Creator & Assets
- [ ] Storefront page
- [ ] Asset CRUD (draft/publish/archive)
- [ ] File upload (deliverables) via presigned URLs
- [ ] Preview media upload (images)
- [ ] License selection
- [ ] Category & tag assignment

### 1.4 Discovery
- [ ] Explore page (search, category, sort)
- [ ] Asset detail page (web + mobile)
- [ ] Creator storefront public view
- [ ] PostgreSQL full-text search

### 1.5 Commerce
- [ ] Cart (add/remove)
- [ ] Stripe Checkout (one-time payments)
- [ ] Stripe webhook → order paid
- [ ] Download grants + signed URLs
- [ ] Order history + receipts (email)
- [ ] Reviews (verified buyers)

### 1.6 Dashboards
- [ ] Creator dashboard (sales overview, top assets)
- [ ] Buyer library (purchases + downloads)

### 1.7 Admin
- [ ] Moderation queue (review assets)
- [ ] User ban
- [ ] Refund

### 1.8 Platform
- [ ] SEO: SSR, metadata, sitemaps, OG images
- [ ] Responsive mobile web
- [ ] Transactional email (purchase, sale, account)
- [ ] Error monitoring + logging

**Exit criteria:** End-to-end purchase flow works on web and mobile; first real asset sold and downloaded.

---

## Phase 2 — V1 (P1)

**Goal:** Scale monetization, trust, and growth.

### Payments & Payouts
- [ ] Stripe Connect (Express) onboarding
- [ ] Split payments at checkout → direct creator payout
- [ ] Payout scheduling + dashboard

### Trust & Quality
- [ ] Verified creator badge (KYC)
- [ ] File virus/malware scanning
- [ ] Creator response to reviews
- [ ] Dispute flow

### Growth & Marketing
- [ ] Discount codes
- [ ] Curated collections + featured homepage
- [ ] Shareable social cards (dynamic OG images)
- [ ] Affiliate/referral links

### Discovery
- [ ] Migrate search to Meilisearch/Typesense
- [ ] Faceted filters

### Accounts
- [ ] OAuth (Google, Apple, GitHub)
- [ ] 2FA (TOTP)

### Notifications
- [ ] In-app notifications
- [ ] Push notifications (mobile, via Expo)

### Analytics
- [ ] Creator analytics (views, add-to-cart, conversion)
- [ ] Audience insights

### Creator Pro
- [ ] Subscription tier (lower fees, premium tools)

---

## Phase 3 — V2 (P2)

**Goal:** Differentiation and expansion.

- [ ] Personalized recommendations
- [ ] Bundles (multi-asset)
- [ ] Variable / pay-what-you-want pricing
- [ ] Creator subscriptions/memberships (fan clubs)
- [ ] Gift purchases
- [ ] Custom domains for storefronts
- [ ] Team/agency accounts + SSO
- [ ] Localization (multi-language)
- [ ] Affiliate program with commission tracking
- [ ] Webhooks / API for creators

---

## Milestone checkpoints

| Milestone | Target | Definition of done |
| --- | --- | --- |
| M0 — Scaffold | Now | Monorepo + plan + placeholders boot |
| M1 — MVP | Phase 1 | End-to-end purchase on web + mobile |
| M2 — Launch | Post-Phase 1 | Public launch, seeded creators, monitored |
| M3 — Monetize | Phase 2 | Stripe Connect payouts live |
| M4 — Grow | Phase 2 | Marketing tools + search upgrade |
| M5 — Scale | Phase 3 | Recommendations + subscriptions |
