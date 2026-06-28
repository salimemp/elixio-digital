# Elixio Digital — Comprehensive Product & Technical Plan

> A creator-first digital asset marketplace where creators **showcase**, **market**, and **sell** digital assets to prospective buyers.

This document is the single source of truth for the product vision, scope, architecture, data model, monetization, and delivery plan. It is intended for the whole team — product, design, engineering, and operations.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Vision & Problem Statement](#2-vision--problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Audience & Personas](#4-target-audience--personas)
5. [Competitive Landscape](#5-competitive-landscape)
6. [Core Value Proposition](#6-core-value-proposition)
7. [Feature Scope](#7-feature-scope)
8. [User Flows](#8-user-flows)
9. [Information Architecture](#9-information-architecture)
10. [Monetization Model](#10-monetization-model)
11. [Technical Architecture](#11-technical-architecture)
12. [Data Model Overview](#12-data-model-overview)
13. [Security, Trust & Compliance](#13-security-trust--compliance)
14. [Observability & Operations](#14-observability--operations)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Delivery Roadmap](#16-delivery-roadmap)
17. [Open Questions](#17-open-questions)

---

## 1. Executive Summary

Elixio Digital is a cross-platform marketplace for digital assets. Creators set up a storefront, upload and showcase their digital goods, market them to an audience, and sell them to buyers with secure checkout, licensing, and instant delivery. Buyers discover assets via search and curated collections, preview them, purchase, and download.

The platform launches as a **web app (Next.js)** for discovery/SEO and a **mobile app (React Native/Expo)** for on-the-go browsing, buying, and creator management — backed by a **custom Node.js API** and **PostgreSQL**.

**Funding model:** transaction fees on sales + optional creator subscriptions for premium tools. No listing fees to keep the barrier to entry low.

---

## 2. Vision & Problem Statement

### Vision
Become the default place where independent creators turn their digital work into income — with the polish of a premium storefront, the reach of a marketplace, and the ownership of a direct-to-buyer business.

### Problem
- **Creators** struggle to monetize digital work: generic file-sharing tools lack storefronts and marketing; existing marketplaces take high cuts, bury individual brands, and offer weak analytics.
- **Buyers** struggle to find trustworthy, high-quality, well-licensed digital assets without wading through spammy listings.
- **Trust** is missing: no clear licensing, inconsistent quality, payment and delivery friction.

### Solution
A creator-first marketplace that combines: (a) a personalizable storefront, (b) built-in marketing tools, (c) clear licensing & secure payments, (d) quality signals & curation, (e) cross-platform reach (web + mobile).

---

## 3. Goals & Success Metrics

### Product Goals (next 12 months)
1. Launch web + mobile MVP with end-to-end purchase flow.
2. Reach 1,000 published assets and 10,000 registered users.
3. Achieve a first-purchase conversion rate ≥ 4% on visit-to-checkout.
4. Maintain ≥ 4.5/5 average asset rating with a moderation SLA.

### Success Metrics (KPIs)
| Category | Metric | Target |
| --- | --- | --- |
| Acquisition | Monthly active users (MAU) | +15% MoM after launch |
| Activation | % signups who publish OR purchase within 7 days | ≥ 30% |
| Engagement | Assets previewed per session | ≥ 3 |
| Revenue | Gross merchandise value (GMV) / month | growth tracked |
| Revenue | Take rate realized (fees / GMV) | 8–12% |
| Trust | Avg. asset rating | ≥ 4.5 |
| Trust | % orders fulfilled without dispute | ≥ 98% |
| Retention | 90-day buyer repurchase rate | ≥ 20% |
| Performance | API p95 latency | < 300ms |
| Performance | Web LCP (Largest Contentful Paint) | < 2.5s |

---

## 4. Target Audience & Personas

### Primary personas

**P1 — "Maya", the Indie Designer (Creator)**
- Sells UI kits, icons, illustration packs, Notion templates.
- Wants a branded storefront, marketing tools, fast payouts, and ownership of customer relationships.
- Pain: Gumroad is generic; Etsy is for physical; building a Shopify site is too much.

**P2 — "Devon", the Developer Creator (Creator)**
- Sells code snippets, boilerplates, components, e-books, courses.
- Wants versioning, license clarity, and analytics on what sells.
- Pain: No good place that handles licensing + delivery + payouts for code.

**P3 — "Aria", the Content Buyer (Buyer)**
- Freelancer/PM who needs assets for client work.
- Wants quality, clear licensing, previews, and one-click purchase + download.
- Pain: Spammy results, unclear licenses, no previews before paying.

**P4 — "Sofia", the Hobbyist Buyer (Buyer)**
- Buys templates/music/3D assets for personal projects.
- Price-sensitive; motivated by discovery and bundles.

### Secondary personas
- **Agencies** buying team licenses.
- **Affiliates/partners** promoting assets for commission.

---

## 5. Competitive Landscape

| Platform | Strength | Gap Elixio addresses |
| --- | --- | --- |
| Gumroad | Simple, creator payouts | Weak discovery; no real marketplace curation; generic storefronts |
| Etsy | Huge audience | Digital-asset UX is an afterthought; licensing unclear |
| Creative Market | Curated, design-focused | High bar to entry; high fees; web only |
| Envato | Massive catalog | Cluttered; creator margins thin; subscription-heavy |
| Lemon Squeezy | Merchant-of-record, tax | Not a discovery marketplace |

**Differentiators:** creator-first storefront branding, cross-platform (web + native mobile), transparent licensing, built-in marketing toolkit, fair take rate with clear payout timelines.

---

## 6. Core Value Proposition

- **For creators:** "Your storefront, your brand, your audience — with marketplace reach and zero payment headaches."
- **For buyers:** "Discover, preview, and buy high-quality digital assets with clear licenses and instant delivery — on web or mobile."

---

## 7. Feature Scope

Features are grouped by phase: **MVP (P0)**, **V1 (P1)**, **Future (P2)**. See [`ROADMAP.md`](./ROADMAP.md) for sequencing.

### 7.1 Accounts & Identity
- [P0] Email/password registration & login (JWT access + refresh tokens).
- [P0] Dual role: a user can be both creator and buyer.
- [P0] Profile: avatar, display name, bio, links, location.
- [P1] OAuth (Google, Apple, GitHub).
- [P1] Two-factor authentication (TOTP).
- [P2] SSO for agencies/teams.

### 7.2 Creator Storefront
- [P0] Customizable storefront page (banner, bio, social links).
- [P0] Public creator profile with listed assets.
- [P1] Custom subdomain / vanity URL.
- [P1] Storefront themes/accent colors.
- [P2] Custom domain support.

### 7.3 Asset Management (Showcase)
- [P0] Create asset: title, description, category, tags, price.
- [P0] Upload asset files (delivered on purchase) + preview media (images, video).
- [P0] Asset states: draft, published, archived.
- [P0] License selection (Personal, Commercial, Extended).
- [P1] Versioning (update files; buyers get latest).
- [P1] Bundles (sell multiple assets together).
- [P2] Variable pricing / pay-what-you-want / tiered licenses.

### 7.4 Discovery & Marketing (Market)
- [P0] Search by keyword, category, tags.
- [P0] Category browse + sort (newest, popular, price).
- [P0] Asset detail page with gallery, description, license, reviews summary.
- [P1] Curated collections & "featured" homepage.
- [P1] Full-text search (PostgreSQL FTS → later Meilisearch).
- [P1] Creator marketing tools: shareable links, discount codes, social cards (OG images).
- [P2] Personalized recommendations.
- [P2] Affiliate/referral links with commission.

### 7.5 Purchase & Delivery (Sell)
- [P0] Cart + Stripe checkout (one-time payments).
- [P0] Instant secure download after purchase (signed URLs, time-limited).
- [P0] Order history & downloadable receipts.
- [P0] License attached to each purchase.
- [P1] Stripe Connect for direct creator payouts (split payments).
- [P1] Wishlist / save for later.
- [P2] Subscriptions/memberships (creator fan clubs).
- [P2] Gift purchases.

### 7.6 Trust & Quality
- [P0] Star ratings + written reviews (buyers only).
- [P0] Basic content moderation (report assets).
- [P1] Verified creator badges (identity/KYC).
- [P1] Automated file scanning (malware/size/type checks).
- [P2] Dispute resolution center.

### 7.7 Creator Dashboard & Analytics
- [P0] Sales overview (revenue, orders, top assets).
- [P0] Payout tracking.
- [P1] Traffic & conversion analytics (views, add-to-cart, conversion).
- [P1] Audience insights (geo, referral source).
- [P2] Exportable reports / webhooks.

### 7.8 Notifications
- [P0] Email: purchase receipt, sale notification, account.
- [P1] In-app + push notifications (mobile).
- [P1] Email marketing opt-in (creator → their followers).

### 7.9 Admin
- [P0] Admin panel: moderate/review assets, ban users, refund.
- [P1] Platform analytics, fee configuration, featured curation.
- [P2] Support ticketing.

### 7.10 Platform-wide
- [P0] Responsive web (mobile-first) + SEO (SSR, sitemaps, OG tags).
- [P0] i18n-ready (English first).
- [P1] Dark mode.
- [P2] Localization (multi-language).

---

## 8. User Flows

### 8.1 Creator publishes an asset
1. Sign up / log in → switch to Creator mode.
2. Dashboard → "New Asset".
3. Fill metadata (title, description, category, tags, price, license).
4. Upload deliverable files + preview media.
5. Preview → set to **Draft** or **Publish**.
6. Asset appears in storefront + marketplace search.
7. Creator receives email on first sale.

### 8.2 Buyer purchases an asset
1. Discover via search/category/creator page.
2. Open asset detail → preview gallery, read license & reviews.
3. "Add to cart" / "Buy now" → Stripe checkout.
4. Payment success → order created → secure download link generated.
5. Buyer downloads from order page or email receipt.
6. Buyer can leave a review.

### 8.3 Payout to creator (P1)
1. Sale captured → platform fee deducted → creator balance credited.
2. On payout cycle (or threshold), Stripe Connect transfer initiated.
3. Creator sees payout record in dashboard.

---

## 9. Information Architecture

```
Elixio Digital
├── Marketing (public, web-only)
│   ├── Landing / Home
│   ├── How it works (creators / buyers)
│   ├── Pricing (platform fees)
│   └── Legal (terms, privacy, licenses)
├── Marketplace (web + mobile)
│   ├── Explore / Search
│   ├── Categories
│   ├── Asset detail
│   ├── Creator storefront
│   ├── Cart & Checkout
│   └── User: Library (purchases), Wishlist, Settings
├── Creator Dashboard (web + mobile)
│   ├── Overview / Analytics
│   ├── Assets (list, create, edit)
│   ├── Orders & Payouts
│   ├── Marketing (codes, links)
│   └── Storefront settings
└── Admin (web-only)
    ├── Moderation queue
    ├── Users
    ├── Assets
    └── Platform metrics
```

---

## 10. Monetization Model

### Revenue streams
1. **Transaction fee (primary):** platform takes a percentage of each sale.
   - Default: **10%** platform fee (configurable per category/creator).
   - Payment processing (Stripe ~2.9% + $0.30) passed through or absorbed based on tier.
2. **Creator Pro subscription (P1):** lower fees + premium marketing tools + analytics.
   - e.g., $19/mo → fee drops to 6%, unlocks advanced analytics, custom subdomain, discount codes.
3. **Featured placement (P2):** optional paid promotion in search/collections (clearly labeled).
4. **Affiliate program (P2):** referrers earn commission; platform takes a share.

### Payouts
- MVP: platform collects all funds; manual/periodic creator payouts.
- V1: **Stripe Connect** — split payments at point of sale; creators onboard via Stripe.

### Pricing principles
- No listing fees (low barrier to entry).
- Transparent fees shown at checkout and in creator dashboard.
- Buyers never pay extra beyond price + applicable tax.

---

## 11. Technical Architecture

> Full details: [`ARCHITECTURE.md`](./ARCHITECTURE.md). Summary below.

### High-level
```
┌───────────────┐   ┌───────────────┐        ┌──────────────────────────┐
│  Next.js Web  │   │  Expo Mobile  │  ──►   │  Node.js + Fastify API   │
│  (SSR/SSG)    │   │  (iOS/Android)│        │  REST + Prisma           │
└───────────────┘   └───────────────┘        └───────────┬──────────────┘
                                                          │
                       ┌────────────────┬─────────────────┼──────────────┐
                       ▼                ▼                 ▼              ▼
                 PostgreSQL        Object Storage     Stripe        Email/Notify
                 (primary DB)      (S3-compat:        (payments)    (transactional)
                                   files + media)
```

### Tech stack
| Concern | Choice |
| --- | --- |
| Web | Next.js 14 App Router, React 18, Tailwind CSS |
| Mobile | Expo SDK 56, React Native 0.85, Expo Router                            |
| API | Node.js 24, Fastify, TypeScript                                          |
| DB | PostgreSQL 14+ via Prisma ORM |
| Auth | JWT access (short-lived) + refresh (rotating); bcrypt; optional OAuth |
| Payments | Stripe + Stripe Connect (creator payouts) |
| Storage | S3-compatible object storage; signed URLs for delivery |
| Search | PostgreSQL full-text search (MVP) → Meilisearch/Typesense (V1) |
| Queue/Jobs | BullMQ + Redis (email, payouts, file processing) — V1                    |
| Monorepo | pnpm 10.15.0 workspaces + Turborepo                                       |
| Testing | Vitest (unit/integration), Playwright (web E2E), Maestro (mobile E2E)      |
| CI/CD | GitHub Actions                                                              |
| Hosting | Cloudflare Pages (web), Railway (API + PostgreSQL), EAS (mobile builds)   |

### Shared logic
`packages/shared` holds Zod schemas, TypeScript types, enums, and constants used by web, mobile, and API — ensuring a single source of truth for validation and contracts.

---

## 12. Data Model Overview

> Full schema: [`DATABASE.md`](./DATABASE.md) and `apps/api/prisma/schema.prisma`.

Core entities:
- **User** — account, profile, roles (buyer/creator/admin).
- **Storefront** — a creator's public shop (1:1 with creator User).
- **Asset** — a digital product; has files, preview media, license, price, status.
- **AssetFile** — deliverable files (stored in object storage).
- **AssetMedia** — preview images/video.
- **Category / Tag** — taxonomy for discovery.
- **License** — license type attached to an asset.
- **Cart / CartItem** — pre-purchase.
- **Order / OrderItem** — purchase record.
- **DownloadGrant** — time-limited, signed access to purchased files.
- **Review** — buyer rating + comment on an asset.
- **Payout** — creator payout record.
- **DiscountCode** — marketing coupons.
- **Collection** — curated groups of assets.

---

## 13. Security, Trust & Compliance

### Security
- Passwords hashed with bcrypt (cost ≥ 12).
- JWT access tokens short-lived (15 min); refresh tokens rotating, stored hashed, httpOnly cookie on web.
- All API routes rate-limited; auth required except public read endpoints.
- Input validation everywhere via Zod (`@elixio/shared`).
- Signed, time-limited URLs for asset downloads; files never publicly readable.
- File upload validation: type allowlist, max size, virus scan (P1).
- Secrets via environment variables; never committed. `.env.example` as template.
- HTTPS everywhere; HSTS on web.

### Trust
- Verified creator badges after identity check (P1).
- Reviews restricted to verified buyers.
- Moderation queue + reporting.
- Clear, human-readable licenses on every asset.

### Compliance
- **PCI:** Stripe handles card data; we never touch raw card numbers (SAQ-A scope).
- **Tax:** Stripe Tax / merchant-of-record handling (P1) for VAT/GST.
- **Privacy/GDPR:** data export & delete (right to erasure) — P1.
- **DMCA:** takedown process for IP claims.
- **Terms & licenses:** clear Terms of Service + per-asset license text.

---

## 14. Observability & Operations

- **Logging:** structured JSON logs (pino) in API; request IDs for tracing.
- **Metrics:** API latency, error rates, checkout funnel; dashboards.
- **Uptime:** health check endpoints (`/health`, `/ready`).
- **Alerting:** error spikes, failed payouts, failed jobs.
- **Backups:** daily PostgreSQL backups + point-in-time recovery.
- **Feature flags:** for gradual rollouts (P1).

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Low-quality/spam assets flood marketplace | Trust loss | Moderation queue, reporting, quality signals, review gating |
| Payment/payout errors | Revenue + legal | Stripe Connect for direct transfers; reconcile daily; idempotent webhooks |
| Asset piracy / unauthorized redistribution | Creator churn | Signed URLs, watermarks on previews, license enforcement, DMCA process |
| Mobile app store rejection | Launch delay | Follow guidelines; no prohibited content; clear IAP rules reviewed pre-submit |
| Cold-start: no buyers / no creators | Marketplace failure | Seed with curated creators; targeted onboarding; bundles; affiliate program |
| Scale/performance at launch | Slow UX | Cache read paths, paginate, CDN for media, search index migration plan |
| Data loss | Critical | Automated DB backups + tested restore drills |

---

## 16. Delivery Roadmap

See [`ROADMAP.md`](./ROADMAP.md) for the phased plan with current status.

**Snapshot (28 June 2026)**:

- **Phase 0 — Foundation:** ✅ done (Q4 2025)
- **Phase 1 — MVP:** ~85% done. Auth + asset CRUD + creator tools + buyer library + dashboards + admin basics all live. **Blocked on Stripe integration** (~5% of MVP remaining).
- **Phase 2 — V1:** ~30% done. AI tools (Gemini), bulk ops, OAuth, MFA TOTP, WebAuthn passkeys, full-text search, creator analytics are all shipped. Remaining: Stripe Connect payouts, push notifications, real-time search index.
- **Phase 3 — V2:** ~5% done. Bundles (shipped as creator tool), i18n with 42 locales (shipped). Remaining: recommendations, subscriptions/memberships, affiliate program, custom domains.

**Key implementation deltas vs original plan**:

- ✅ Auth: Email + password (bcrypt 12) + MFA TOTP + WebAuthn passkeys + OAuth (Google/GitHub) + magic link — all shipped
- ✅ 42 locales at launch (vs planned ~10)
- ✅ 127 tax rates across 41 countries with multi-slab normalization (IN-GST-N, CN-VAT-N, JP-CTAX-N) — originally planned as external Stripe Tax integration
- ✅ AI tools (Gemini 1.5 Flash) — originally planned for V2/V3
- ✅ Bulk ops with rollback — shipped early
- ❌ Stripe Connect payouts — deferred to V1 (was planned for V1)
- ❌ Real-time search index (Meilisearch) — still using Postgres FTS (sufficient at current scale)
- ❌ Push notifications — deferred
- ❌ Sentry error monitoring — deferred

See [`ROADMAP.md`](./ROADMAP.md) for the complete milestone tracker.

---

## 17. Open Questions

1. **Merchant of record:** Should Elixio act as merchant of record (handle all tax) or let creators via Stripe Connect? (Affects Phase 2 scope.)
2. **Asset categories at launch:** Which 4–6 categories to seed (e.g., Design, Code, Writing, Audio, 3D, Templates)?
3. **Mobile parity:** Full mobile creator dashboard, or mobile = browse/buy + web = create? (Lean toward web for creation in MVP.)
4. **Free vs. paid assets:** Allow free/"pay what you want" at MVP, or paid-only?
5. **Review gating:** Require purchase before review (yes), but allow creator response? (Yes — P1.)
6. **Localization priority markets:** Which languages first?
