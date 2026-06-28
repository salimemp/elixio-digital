# Roadmap

Phased delivery plan for Elixio Digital. Items marked **P0** are MVP, **P1** is V1, **P2** is V2.

> **Last updated:** 2026-06-28. Current status: **MVP → V1 transition.**
> [x] = done in code & live in production · [~] = partial / placeholder · [ ] = not started

---

## Phase 0 — Foundation ✅ DONE (Q4 2025)

**Goal:** Runnable monorepo with structure, config, plan, and placeholders.

- [x] Monorepo setup (pnpm 10 + Turborepo + tsconfig)
- [x] Project structure (apps/web, apps/mobile, apps/api, packages/shared)
- [x] Plan + architecture docs (docs/PLAN.md, docs/ARCHITECTURE.md)
- [x] Database schema (Prisma, 35 models)
- [x] API route skeleton + OpenAPI-style spec
- [x] Placeholder web pages + mobile screens
- [x] Shared types, Zod schemas, constants

**Exit criteria met:** `pnpm install` + `pnpm dev` boots all three apps; `pnpm typecheck` passes.

---

## Phase 1 — MVP (P0) — ~85% DONE

**Goal:** A creator can publish an asset; a buyer can discover, buy, and download it — end to end, on web + mobile.

### 1.1 Infrastructure
- [x] CI (GitHub Actions): install, lint, typecheck, build (`.github/workflows/ci.yml`)
- [x] Staging + prod environments (Railway staging + production)
- [ ] Docker Compose for local Postgres (Railway-hosted PG only today)
- [~] Object storage — schema ready (`AssetFile.storageKey`), presigned URL **not wired**

### 1.2 Auth & Users
- [x] Register / login (JWT access + refresh, sliding window 7-day)
- [x] **Separate creator vs buyer signup** (`signupType: "creator" | "buyer"` — distinct DB re-check on every request)
- [x] HIBP pwned-password check (k-anonymity, server-side)
- [x] Strong password policy (8+ chars + number + special, Zod-strength validated client + server)
- [x] Profile create/edit
- [x] Password reset (email link, 1h TTL)
- [x] Magic link sign-in (15min TTL, single-use)
- [x] Email verification (24h TTL, non-fatal — doesn't block login)
- [x] MFA TOTP (pyotp + qrcode backend, qr_flutter frontend, backup codes)
- [x] WebAuthn / passkeys
- [x] OAuth (Google, GitHub) — code paths exist, env keys still placeholder
- [x] New-location login email alert (ipapi.co + 7-day cache, fire-and-forget)
- [x] Per-action rate limits (DB-backed sliding window): login 10/15min, register 5/hr, password-reset 3/hr, magic-link 3/15min, MFA 5/5min
- [x] Global IP rate limit (@fastify/rate-limit 2000/min/IP, excludes /health)

### 1.3 Creator & Assets
- [x] Storefront page (custom slug, branding)
- [x] Asset CRUD (draft/publish/archive)
- [x] Asset file (deliverables) — schema ready, R2 upload not wired
- [~] Preview media upload — schema ready, UI not built
- [x] License selection (4 license types)
- [x] Category & tag assignment

### 1.4 Discovery
- [x] Explore page (search, category, sort)
- [x] Asset detail page (web)
- [x] Creator storefront public view
- [ ] PostgreSQL full-text search (planned, no implementation yet)
- [~] Asset view tracking (fire-and-forget, no analytics dashboard yet)

### 1.5 Commerce
- [~] Order + DownloadGrant (DB model + `POST /downloads/:id` route that returns 501 — Stripe not wired)
- [ ] Cart (add/remove) — not started
- [ ] Stripe Checkout (one-time payments) — not started
- [ ] Stripe webhook → order paid — not started
- [ ] Order history page — model only
- [ ] Reviews (verified buyers) — model only
- [x] Tax calculation (`POST /tax/calculate`, 122 regions across 41 countries: US 50+DC, EU 27, UK, India 5 GST slabs, Canada 13 provinces, AU, JP, BR federal+ICMS, GCC UAE/SA/OM/BH/KW/QA, Israel, Switzerland, Singapore, Norway, Hong Kong)
- [x] Tax snapshot on Order (TaxLineItem frozen at purchase time)

### 1.6 Dashboards
- [x] Creator dashboard — full analytics (revenue chart, top assets, cohort retention heatmap, period comparison, CSV export)
- [x] Buyer library (purchases + downloads)
- [x] Studio (3-tab AI workspace: listing copywriter, asset critique, sales coach)

### 1.7 Admin
- [~] Admin user (admin@elixiodigital.com, bootstrap script)
- [ ] Moderation queue UI — not started
- [ ] User ban UI — not started
- [ ] Refund flow — not started
- [ ] Admin login attempt monitoring — partial (logs to DB, no dashboard)

### 1.8 Platform
- [x] SEO: SSR + sitemap + robots + JSON-LD Article schema + RSS/Atom + IndexNow
- [x] 11 HarborSEO articles published (4 vs-Gumroad, 1 vs-Lemon-Squeezy, 1 vs-Payhip, 1 vs-Creative-Market, 4 how-to guides)
- [x] Public stats dashboard (`/stats`, 60s revalidate)
- [x] i18n (42 locales; 9 priority fully translated: en/es/fr/de/hi/pt/ar/ur/he; 33 scaffolded with `needs_human_review: true`)
- [x] Theme system (light/dark/system + 4 brand palettes: Default/Sunset/Ocean/Forest, persisted to localStorage)
- [x] Transactional email (Resend with retry 1s/4s/16s + fire-and-forget for non-blocking)
- [x] Helmet (HSTS 2yr preload + strict CSP + X-Frame DENY)
- [x] WCAG contrast verification (gum-btn-primary 9.36:1 in dark mode; navbar button fix shipped 2026-06-28)
- [ ] Error monitoring (Sentry) — not wired
- [ ] Push notifications — not started

**MVP exit criteria:** end-to-end purchase flow works. Currently blocked on Stripe wiring (1.5).

---

## Phase 2 — V1 (P1) — ~30% DONE

**Goal:** Scale monetization, trust, and growth.

### Already shipped (was P1, lifted from Phase 2 spec)
- [x] OAuth (Google, GitHub) — 1.2 above
- [x] 2FA TOTP — 1.2 above
- [x] WebAuthn passkeys — 1.2 above
- [x] AI tools: listing copywriter, asset critique, sales coach (Gemini 1.5 Flash multimodal)
- [x] Bulk operations (with before-snapshot undo, 30-day history)
- [x] Asset thumbnail, bundle (zip), metadata extractor, PDF→images (Apache 2.0 pdfjs-dist + @napi-rs/canvas Skia — MuPDF.js rejected for AGPL-3.0 SaaS contamination)

### Payments & Payouts
- [ ] Stripe Connect (Express) onboarding
- [ ] Split payments at checkout → direct creator payout
- [ ] Payout scheduling + dashboard
- [ ] Background job queue (BullMQ + Upstash Redis) for payout processing — see docs/PHASE-2-UPGRADE.md

### Trust & Quality
- [ ] Verified creator badge (KYC)
- [ ] File virus/malware scanning (ClamAV or external)
- [ ] Creator response to reviews
- [ ] Dispute flow

### Growth & Marketing
- [~] Discount codes (model only, no UI)
- [~] Curated collections (model only, no UI)
- [~] Featured homepage (parts done, no full curation UI)
- [ ] Shareable social cards (dynamic OG images)
- [ ] Affiliate/referral links

### Discovery
- [ ] Migrate search to Meilisearch/Typesense
- [ ] Faceted filters (price range, rating, license type, file type)

### Notifications
- [ ] In-app notifications
- [ ] Push notifications (mobile, via Expo)
- [ ] Email digest (weekly creator sales summary)

### Analytics
- [x] Creator analytics — see 1.6 above
- [ ] Audience insights (geo breakdown, device breakdown, referrer analysis)

### Creator Pro
- [ ] Subscription tier (lower fees, premium tools)

---

## Phase 3 — V2 (P2) — ~5% DONE

**Goal:** Differentiation and expansion.

- [ ] Personalized recommendations (CF Workers AI + Vectorize)
- [x] Bundles (multi-asset) — shipped as creator tool
- [ ] Variable / pay-what-you-want pricing
- [ ] Creator subscriptions/memberships (fan clubs)
- [ ] Gift purchases
- [ ] Custom domains for storefronts
- [ ] Team/agency accounts + SSO (SAML / OIDC)
- [x] Localization (multi-language) — 42 locales shipped
- [ ] Affiliate program with commission tracking
- [ ] Webhooks / public API for creators

---

## Tech debt to track (not in roadmap, but real)

| Item | Status | Notes |
|---|---|---|
| React version split (web 18 vs mobile 19) | Pin via pnpm.overrides, plan in `docs/PHASE-2-UPGRADE.md` | Next.js 15 upgrade unblocks React 19 |
| TS version (root 5.5.4, mobile wanted 6.0.3) | Now aligned to 5.9.3 via root pnpm.overrides | TS 6 deferred to Phase 2 upgrade |
| Background jobs (BullMQ + Redis) | Email retry now in-process; payouts need real queue when they ship | Doc in `docs/PHASE-2-UPGRADE.md` |
| Test coverage on security/money paths | Sparse — see audit task in progress | Target: 80% on `auth.ts`, `tax.ts`, `downloads.ts`, role guards |
| pnpm 10 + node-linker=hoisted + Cloudflare Pages | Pages → Workers migration deferred (1-2h work) | See memory: cloudflare-pages-opennext-pitfalls |
| `.vercel/.env.development.local` | Properly gitignored, also added nested .gitignore for defense | Audited 2026-06-28 |

---

## Milestone checkpoints

| Milestone | Target | Definition of done |
|---|---|---|
| M0 — Scaffold | Q4 2025 ✅ | Monorepo + plan + placeholders boot |
| M1 — MVP | Q2 2026 (in progress, 85%) | End-to-end purchase on web + mobile — needs Stripe |
| M2 — Launch | Post-MVP | Public launch, seeded creators, monitored |
| M3 — Monetize | Phase 2 | Stripe Connect payouts live |
| M4 — Grow | Phase 2 | Marketing tools + search upgrade |
| M5 — Scale | Phase 3 | Recommendations + subscriptions |