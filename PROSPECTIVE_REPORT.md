# Elixio Digital — Prospective Project Report

**Report date:** 2026-06-25
**Author:** Mavis (lead)
**Repo:** `~/Desktop/Elixio_Digital`
**Status:** Active development, post-upgrade

> Forward-looking assessment of the project: where it stands today, what was changed in this session, what the next 90 days should look like, and the risks worth watching. Intended for the solo founder (Abdul Salim) as the working reference document for the rest of 2026.

---

## TL;DR

- Elixio Digital is a **well-scoped creator-marketplace monorepo** at the end of Phase 0 (foundation) with a clear plan through Phase 3. Plan/architecture/DB/API docs are mature; the codebase is a clean scaffold, not a half-built app.
- **Mobile stack was on a dead-end version** (Expo SDK 54 / React Native 0.79.7, EOL October 2025). This session upgraded it to **Expo SDK 56 / React Native 0.85.3 / React 19.2.3** — the most stable supported combination as of today. Typecheck passes; SDK alignment verified clean.
- **No git repo on the project root.** That is the single biggest blocker for everything else (CI, version history, deploy, EAS builds, even backup). Initialize a git repo and push to GitHub today.
- The fastest path to a usable MVP is **M1: end-to-end purchase on web first** (the web stack is closer to ready), then port the buyer flow to mobile. Don't ship mobile-first creation tools.
- **Top three risks:** (1) no version control, (2) no CI, (3) Stripe + object storage not yet wired — all three are P0 to fix in the next 14 days.

---

## 1. Project snapshot

### 1.1 What it is

A cross-platform marketplace where **creators** showcase and sell digital assets (templates, design files, code, ebooks, music, 3D, photography) and **buyers** discover, preview, purchase, and download licensed files with secure delivery.

### 1.2 Monorepo layout

```
elixio-digital/
├── apps/
│   ├── web/        Next.js 14 (App Router)        — marketing + marketplace
│   ├── mobile/     Expo SDK 56 (RN 0.85)          — iOS/Android buyer app
│   └── api/        Node 24 + Fastify + Prisma     — REST API + PostgreSQL
├── packages/
│   └── shared/     Zod schemas + TS types
├── docs/           PLAN, ROADMAP, ARCHITECTURE, DATABASE, API
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### 1.3 Tech stack (as of today)

| Layer | Technology | Version |
| --- | --- | --- |
| Web | Next.js 14 (App Router) + React 18 | 14.2.15 / 18.3.1 |
| Mobile | Expo SDK 56 + React Native + React | 56.0.12 / 0.85.3 / 19.2.3 |
| API | Node 24 + Fastify 4 + Prisma 5 | node 24-alpine / 4.28 / 5.16 |
| DB | PostgreSQL 14+ | via Prisma |
| Auth | JWT (access + refresh) + bcrypt | — |
| Payments | Stripe Checkout → Stripe Connect (V1) | — |
| Storage | S3-compatible (R2/S3/B2) — **not yet chosen** | — |
| Search | PostgreSQL FTS → Meilisearch (V1) | — |
| Monorepo | pnpm 10.15.0 + Turborepo 2.x | — |
| Hosting | Cloudflare Pages (web), Railway (API+Postgres), EAS (mobile) | — |

### 1.4 Code health (rough)

| App | Files | Lines (TS/TSX) | Status |
| --- | ---: | ---: | --- |
| `apps/api` | 14 | ~600 | Routes + services skeleton; Prisma client not generated yet |
| `apps/web` | 18 | ~430 | App Router pages scaffolded; placeholder data; no auth wiring |
| `apps/mobile` | 16 | ~430 | Expo Router screens scaffolded; placeholder data; no API client yet |
| `packages/shared` | 11 | ~430 | Zod schemas + types complete enough for the planned MVP surface |
| **Total** | **59** | **~1,890** | Typecheck passes on web/mobile/shared; API blocks on missing Prisma generate |

---

## 2. What changed in this session

### 2.1 React Native / Expo upgrade (the main ask)

**Before:** `expo: ^54.0.35`, `react-native: ^0.79.7`, `expo-router: ^4.0.22`
**After:** `expo: ~56.0.12`, `react-native: 0.85.3`, `expo-router: ~56.2.11`, `react: 19.2.3`

#### Why 0.85 and not 0.86

Two candidates were on the table:

| Option | Status | Pros | Cons |
| --- | --- | --- | --- |
| **RN 0.85 (Expo SDK 56)** | Stable, ~1 month old, multiple patches (0.85.3 latest) | Battle-tested Expo SDK; all peer deps resolved; recommended by Expo template; React 19.2.3 | None material |
| **RN 0.86 (Expo canary)** | Released 2026-06-11, only 2 weeks old, no breaking changes vs 0.85 | Newer; Android 15+ edge-to-edge; React Native DevTools improvements | Expo support only via `expo@canary`; latest reanimated/worklets peer deps inconsistent with current `expo-modules-core@56.0.17` (reanimated 4.5 wants worklets 0.10.x; expo-modules-core wants 0.7.4 \|\| 0.8.0); less patch polish |

**Decision: 0.85 / SDK 56.** It's the more stable production target. RN 0.86 can come later as a 1-line bump once Expo ships a matching canary SDK 57 with reconciled peer deps.

#### Files changed (mobile)

- `apps/mobile/package.json` — full dependency refresh
- `apps/mobile/tsconfig.json` — added `"ignoreDeprecations": "6.0"` for TS 6 baseUrl deprecation
- `package.json` (root) — added `pnpm.overrides` to pin `react-native-reanimated@4.3.1` (worklets 0.8.3 compatibility)

#### Verified

- `pnpm install` runs clean (only pre-existing web warnings about `@types/react-dom` and `@cloudflare/next-on-pages` remain — these are pre-mobile-upgrade issues, not introduced by this change)
- `npx expo install --check` reports "Dependencies are up to date"
- `pnpm --filter @elixio/mobile typecheck` passes
- All required peer deps satisfied: `expo-constants@56.0.18`, `expo-linking@56.0.14`, `@expo/metro-runtime@56.0.15`, `react-native-worklets@0.8.3`

#### Pinned version matrix (mobile)

```json
{
  "expo": "~56.0.12",
  "expo-constants": "~18.0.13",
  "expo-linking": "~8.0.5",
  "expo-router": "~56.2.11",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "react-native": "0.85.3",
  "react-native-safe-area-context": "~5.7.0",
  "react-native-screens": "4.25.2",
  "react-native-worklets": "0.8.3",
  "@babel/core": "^7.26.0",
  "@expo/metro-runtime": "~56.0.15",
  "@react-native/metro-config": "0.85.3",
  "@types/react": "~19.2.2",
  "typescript": "~6.0.3"
}
```

The `expo-constants`/`expo-linking` versions stay at the SDK 54 numbers (18.0.13 / 8.0.5) — pnpm's root `overrides` then transparently swap them to the SDK 56 equivalents (56.0.18 / 56.0.14) at install time to satisfy `expo-router`'s peer dep. Doing it this way keeps the human-readable `package.json` aligned with the SDK-major version Expo ships (and avoids the typo'd `~18.0.18` value present in Expo's official SDK 56 template — that version doesn't exist on npm; the real SDK 56 release is `56.0.18`).

### 2.2 Documentation sync

- `README.md` — Tech stack table now reads Expo SDK 56 / RN 0.85
- `AGENTS.md` — Toolchain section now lists SDK 56 / RN 0.85 / React 19.2.3
- `docs/PLAN.md` — Tech stack table updated
- `apps/mobile/README.md` — corrected SDK reference (was misleadingly SDK 51)

---

## 3. State-by-state audit

### 3.1 `apps/web` — Next.js marketplace

| Aspect | Today | Gap |
| --- | --- | --- |
| Routing | App Router with route groups: `(marketing)`, `(marketplace)`, `(auth)`, `dashboard`, `creator/`, `asset/`, `library`, `sell` | All pages render placeholder content |
| Auth | None | JWT login/register must be wired to the API |
| Data | Hardcoded placeholders | No `fetch` against the API client in `apps/web/src/lib/api.ts` |
| Styling | Tailwind 3.4 + brand tokens (gum cream/pink/mint/yellow) | Consistent; ship as-is |
| SEO | None yet | Plan calls for SSR, sitemaps, OG images — not done |
| Deploy target | Cloudflare Pages via `pages:build` | Not yet deployed; `wrangler.toml` is bare |

**Verdict:** Scaffold is solid; needs a real API client and 2–3 days of auth + browse wiring to feel alive.

### 3.2 `apps/mobile` — Expo buyer app

| Aspect | Today | Gap |
| --- | --- | --- |
| Routing | Expo Router with `(tabs)` for explore/search/library/profile + `auth/` + `asset/[id]` + `creator/[slug]` | All screens render placeholders |
| Tabs | Explore (FlatList of 3 placeholder assets), Search, Library (empty), Profile (auth-conditional) | Wire to API when ready |
| Auth | UI only (login/register screens, no submit logic) | Real submit must hit `/auth/login` |
| API client | `apps/mobile/src/lib/api.ts` exists but is unused | Wire `EXPO_PUBLIC_API_URL` from `expo-constants` extra |
| Design system | Custom gum palette via inline `StyleSheet` + `Text` variant component | Consistent, mobile-native look |
| Build target | EAS (`eas.json` not yet present) | Set up EAS project + first build |

**Verdict:** Ready to be wired to the real API. The screens are shaped correctly and the design language is on-brand. No work needed on layout, just data plumbing.

### 3.3 `apps/api` — Fastify backend

| Aspect | Today | Gap |
| --- | --- | --- |
| Routes | `auth`, `users`, `assets`, `categories`, `storefronts`, `health` | All return 200 + placeholders or 501; no real service logic |
| DB | Prisma schema is in plan only (`apps/api/prisma/schema.prisma` not generated) | Run `pnpm db:generate` after writing the schema |
| Auth | Plugin in `src/plugins/auth.ts` but JWT secret not wired | Set `JWT_SECRET` env var |
| Stripe | Not installed | Add `@stripe/stripe-js` (web) + `@stripe/stripe-react-native` (mobile, Expo-compatible) |
| Storage | Not chosen | Pick now (see §6.1) |
| Tests | `vitest` configured, zero tests written | Add a smoke test for `/health` and `/ready` |
| Docker | `Dockerfile` is fine for Railway | Not yet deployed |
| Errors | Plugin exists | Tested only in spirit |

**Verdict:** Highest technical risk area. The bones are right but no real business logic exists yet. The Prisma schema is the next bottleneck — get a real schema in `schema.prisma`, run `db:generate`, and start the first real migration.

### 3.4 `packages/shared` — Types & schemas

| Aspect | Today |
| --- | --- |
| Asset types + Zod schemas | Complete and well-shaped |
| Auth, Order, User types | Present |
| Constants (categories, license codes) | Present |
| Consumers | `apps/web`, `apps/mobile` import via `@elixio/shared` (path mapping in `tsconfig.json`) |

**Verdict:** Good. Add more schemas as new endpoints land.

---

## 4. What's missing for MVP (Phase 1, P0 items)

This is a prioritized punch list derived from `docs/ROADMAP.md` § Phase 1. Items the codebase is silent on are the bottlenecks.

### 4.1 P0 — must do before first real sale (next 14 days)

1. **Initialize git + push to GitHub.** Without this, deploys, CI, EAS, even rollback, are all impossible. Trivial fix, huge unlock.
2. **Pick an object storage provider.** R2 (zero egress) is the obvious pick for cost reasons. Once picked: provision bucket, write a storage plugin in `apps/api`, document the key in `.env.example`.
3. **Write a real Prisma schema.** `apps/api/prisma/schema.prisma` is the only thing between the planned data model and a working API. Mirror `docs/DATABASE.md` 1:1.
4. **Set up CI (GitHub Actions).** Install → lint → typecheck → test → build. Block merges on red. This is one `.github/workflows/ci.yml` and ~30 lines of YAML.
5. **Stripe Checkout integration.** One endpoint, one webhook. Don't build the dashboard before this works end to end.
6. **Asset CRUD (creator side, web only).** `POST /assets`, file upload via presigned URLs, asset detail page.
7. **Auth — register/login flows.** Wire the existing screens to the API; persist tokens (httpOnly cookie on web, secure storage on mobile).

### 4.2 P0 — first 30 days

8. **Search.** PostgreSQL FTS on the `Asset.searchVector` column with a GIN index.
9. **File scanning (P1) — minimum bar.** Type allowlist + max size. Skip virus scan for now; add it in Phase 2.
10. **Order → DownloadGrant → signed URL pipeline.** End-to-end delivery.
11. **Receipts (transactional email).** Resend is the obvious pick on free tier.
12. **Mobile first build on EAS.** Get an internal distribution build working on TestFlight and Google Play internal track.
13. **Sitemap + OG tags + basic SEO.** Required for any discoverability on the web marketplace.

### 4.3 P0 — first 60 days

14. **Reviews (verified buyers only).**
15. **Admin moderation queue** (use the `admin` role guard already in the auth plugin).
16. **Creator dashboard basics** (revenue, orders, top assets).
17. **Cloudflare Pages deploy** of `apps/web`.
18. **Railway deploy** of `apps/api` + managed Postgres.

---

## 5. Decisions to make in the next 7 days

These have downstream effects on architecture and were left open in the plan.

| # | Decision | Default if no answer | Why it matters |
| --- | --- | --- | --- |
| 1 | Object storage | **Cloudflare R2** (zero egress) | S3 pricing will eat margins. R2 is the right pick for a digital-asset marketplace. |
| 2 | Email provider | **Resend** (free tier, 3k/mo) | Resend + React Email templates is the modern default. |
| 3 | Email auth for buyers | **Magic link via Resend** (no passwords) | One less thing to manage; better UX; also lines up with mobile. |
| 4 | Merchant of record | **Stripe Connect Express** (creators onboard their own) | Keeps tax obligations on creators. MoR is overkill for MVP. |
| 5 | Search at MVP | **Postgres FTS + trigram** | Don't introduce Meilisearch until you have ≥ 1k assets. |
| 6 | Hosting for API | **Railway** (managed Postgres + Docker) | Already chosen in the plan; just needs deploy. |
| 7 | Web hosting | **Cloudflare Pages** via `next-on-pages` | Already chosen; needs `pages:build` wired and `wrangler.toml`. |
| 8 | 2FA on buyers | **Defer to Phase 2** | Adds friction at MVP; security can wait for V1. |
| 9 | First launch category | **Design (UI kits, templates, icons)** | Highest-volume digital category; easiest to seed with the founder's network. |
| 10 | Branding: web URL | **elixiodigital.com** (owned) | Confirm domain ownership; if parked, point DNS before launch. |

---

## 6. Cost model (rough monthly OpEx at MVP scale)

| Service | Tier | $/mo |
| --- | --- | ---: |
| Vercel (web — see note) | Free → Pro $20 if traffic grows | 0–20 |
| Cloudflare Pages (web) | Free | 0 |
| Railway (API + Postgres) | Hobby $5 + usage; Pro $20 if you need 24/7 | 5–25 |
| EAS Build (mobile) | Free for dev; Production $99/mo (when ready) | 0–99 |
| Cloudflare R2 | Free up to 10 GB stored + 10M reads | 0–5 |
| Resend (email) | Free up to 3k/mo, then $20 | 0–20 |
| Stripe | 2.9% + 30¢ per transaction | passthrough |
| Domain | Hostinger (existing) | ~1 |
| Sentry (error monitoring) | Free tier | 0 |
| **Total fixed** | | **~7–70** |

> **Vercel note:** the README says web is on Cloudflare Pages, not Vercel. If the project moves to Vercel, add the Vercel Pro $20/mo line. The `vercel` dev-dep in `apps/web/package.json` is leftover from a previous plan; safe to remove.

The cost-minimization stance in the founder profile aligns with this. Path to launch should stay under **$30/mo** for the first 90 days.

---

## 7. Risks and mitigations

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| 1 | No version control | **Critical** | Initialize git + GitHub today; even a private repo is fine. Every subsequent change should be a PR. |
| 2 | No CI / typecheck gate | **High** | Add GitHub Actions workflow on day 1 of having a repo. |
| 3 | Stripe Connect onboarding takes time | **High** | Start with platform-collects (MVP) → flip to Connect in Phase 2. Don't block on it. |
| 4 | No presigned upload flow | **High** | Add the storage plugin + presigned POST before any creator can publish. |
| 5 | Mobile parity risk | **Medium** | Per the plan: keep creation web-first in MVP. Mobile = browse/buy + library. Don't try to do creation on mobile yet. |
| 6 | API has no real Prisma schema | **Medium** | Write the schema and run `pnpm db:generate` this week. |
| 7 | Cold-start: no buyers or sellers | **Medium** | Seed 10–20 hand-picked creators before launch; treat them as launch partners, not customers. |
| 8 | Asset piracy (signed URL leaks) | **Medium** | Short signed-URL TTL (15 min), `maxDownloads` per grant, watermarked previews, DMCA process. |
| 9 | App store rejection (digital goods + IAP) | **Medium** | Apple requires IAP for digital content sold inside the app. **Strategy:** link out to web checkout from the iOS app to avoid IAP. Document this explicitly in the app review notes. |
| 10 | EAS project ID is a placeholder | **Low** | Set the real ID during EAS init; otherwise no harm. |
| 11 | `.env.example` files are placeholders | **Low** | Fill them in; never commit real secrets. |
| 12 | `expo-constants` version pinning is non-obvious | **Low** | Already mitigated via pnpm override. Document the why in a comment. |

---

## 8. Strategic recommendations

### 8.1 Order of operations (next 14 days)

1. `git init` + first commit + push to GitHub.
2. Add `apps/api/prisma/schema.prisma` based on `docs/DATABASE.md`. Run `pnpm db:generate` + first migration.
3. Pick R2 (or S3). Provision bucket. Add `STORAGE_*` to `.env.example`. Add a small storage plugin in `apps/api`.
4. Wire real auth on web (login/register submit) and mobile (login/register submit). Persist tokens.
5. Implement `POST /assets` (create draft) + `POST /assets/:id/files` (presigned upload).
6. Implement Stripe Checkout + webhook.
7. End-to-end test: create account → become creator → upload file → publish asset → checkout as buyer → download.

### 8.2 What to defer (do NOT do in the next 30 days)

- Recommendations, personalization, ML search
- Subscriptions, fan clubs
- Bundles, pay-what-you-want
- Custom domains for storefronts
- Affiliate program
- Localization beyond English
- 2FA
- OAuth (Google/Apple/GitHub)
- Push notifications

### 8.3 Mobile strategy (sharpened)

The plan correctly defers creation to web. Reinforce that:

- **Mobile MVP:** browse, search, asset detail, buy, library, push for sales. No creator tools in mobile.
- **Web MVP:** everything, including the creator dashboard.
- **Native tabs** (Expo Router's `unstable-native-tabs`) is a SDK 56 win worth using for the mobile bottom tabs once the buyer flow is real. It picks up the iOS 26 liquid-glass effect and looks much more native than the current custom emoji approach.

### 8.4 Quick UX win worth considering

The mobile bottom tabs currently use emoji + hard-coded background colors per tab. With SDK 56 + `react-native-screens` 4.25, you can replace with `Tabs` from `expo-router` configured to use `unstable-native-tabs` for a much more native look on both platforms. Two-line change in `apps/mobile/src/app/(tabs)/_layout.tsx`.

---

## 9. Documentation gaps to close

| Doc | Gap |
| --- | --- |
| `AGENTS.md` | No section on "common pitfalls" (e.g., the Expo template's `~18.0.18` typo, the SDK 56 reanimated/worklets peer dep) |
| `README.md` | No `LICENSE` file mentioned — confirm proprietary posture and add a `LICENSE.md` if needed |
| `docs/API.md` | Open questions about request validation errors aren't fully detailed — add an error response example for each class (400/401/403/404/409/429) |
| `docs/PLAN.md` | Open question §17 — at least 3 of 6 still need answers; recommend answering all before M1 |
| `docs/DATABASE.md` | No ER diagram image. Add a quick `mermaid` diagram at the top. |
| `apps/mobile/README.md` | Already updated this session |

---

## 10. Open questions for the founder

1. **Stripe account ready?** You'll need it before any payment integration. Apply today if not done.
2. **Domain in use?** Is `elixiodigital.com` parked, or do you have a different launch domain? Affects SSL + sitemap.
3. **Founder-as-first-creator plan?** Will you seed the marketplace with your own assets? If yes, skip the cold-start problem in §7 row 7.
4. **iOS app store account?** Costs $99/yr. Needed before any iOS release. Don't forget it.
5. **Indie launch vs. private beta?** Indie launch needs SEO + reviews + Stripe Connect onboarding polished. Private beta can skip 60% of that.

---

## 11. Health scorecard

| Dimension | Today | Target (M1) | Target (M2) |
| --- | --- | --- | --- |
| Typecheck | ✅ passes (mobile, web, shared); ❌ API blocks on Prisma generate | ✅ all | ✅ all |
| Lint | ⚠️ configured, never run | ✅ clean | ✅ clean |
| Tests | 0 written | ≥ 1 smoke per service | ≥ 5 path tests |
| CI | ❌ none | ✅ on every PR | ✅ with E2E |
| Deploy | ❌ none | web + API on free tiers | iOS + Android TestFlight tracks |
| Security | bcrypt-12 + JWT spec, no implementation | implemented + audited | rotated keys + audit log |
| Documentation | ✅ plan + roadmap + arch + db + api | add E2E + deploy runbook | add SRE + incident runbook |
| Mobile build | ❌ never built | first EAS preview | TestFlight live |
| Mobile parity | design only | browse/buy/library | buyer + creator lite |

---

## 12. Final word

The project is **at a turning point.** The plan is well-shaped, the architecture is sound, the scaffold is clean, and (as of today) the mobile stack is on a current, supported version. The single biggest unlock for the next 90 days is **getting a real end-to-end purchase working on web** — everything else can be parallelized after that.

Don't over-engineer. Don't add Stripe Connect until you have 5+ creators asking for it. Don't add search until you have 1,000+ assets. Don't add mobile creation tools until mobile has 1,000+ monthly active buyers.

The most likely failure mode for this kind of project is not technical — it's **shipping 80% of a marketplace and never getting the last 20% (real Stripe + real uploads + real moderation).** Focus on the path: Stripe → upload → checkout → download → receipt. Ship that loop, then iterate.

---

*Report authored by Mavis during the 2026-06-25 session that also upgraded the mobile stack to Expo SDK 56 / React Native 0.85.3.*
