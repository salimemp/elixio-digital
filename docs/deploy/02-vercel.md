# Step 2 — Deploy the Web to Vercel

This deploys the Next.js web app. End state: `https://web-*.vercel.app` (auto-generated preview) and `https://elixiodigital.com` (production alias, configured via Cloudflare DNS).

> **Note**: This doc supersedes `02-cloudflare-pages.md` (kept for historical reference). We switched to Vercel because:
> - Next.js 14 App Router + Edge Runtime works out-of-the-box on Vercel.
> - Cloudflare Pages + Next.js requires `@cloudflare/next-on-pages` which has known issues with `pnpm 10` + `node-linker=hoisted` monorepos.
> - Vercel handles the monorepo (root directory = `apps/web`) cleanly.
> See [`docs/PHASE-2-UPGRADE.md`](../PHASE-2-UPGRADE.md) for the technical detail.

## 2.1 Deploy via Vercel CLI

1. **Install the CLI**: `brew install vercel` (or `npm i -g vercel`).
2. **Authenticate**: `vercel login` (uses GitHub OAuth).
3. **Link to project**: `vercel link --yes` from the repo root (auto-detects via `vercel.json` + `package.json` workspaces).
4. **Deploy**:
   ```bash
   vercel deploy --prod --yes --scope abduls-projects-551a11d6
   ```
   The CLI auto-detects `apps/web` as the Next.js project (via `vercel.json` + `package.json` workspaces). It builds with `pnpm install --frozen-lockfile && pnpm --filter @elixio/web build` and outputs `.vercel/output/`.

5. **Alias to production domain** (already done — `elixiodigital.com` is aliased).

## 2.2 Environment variables (web)

Set in Vercel dashboard → Settings → Environment Variables. **Use environment-specific values**: production vs preview.

| Variable | Production value | Preview value |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.elixiodigital.com` | `https://staging-api.elixiodigital.com` (planned) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | (production key, when Stripe wired) | (test key) |
| `NODE_VERSION` | `24` | `24` |
| `PNPM_VERSION` | `10.15.0` | `10.15.0` |

The API URL must match the deployed Railway API URL.

## 2.3 Continuous deployment

Vercel **does not** auto-deploy on push (the repo has no Vercel GitHub App installed). We deploy manually:

```bash
vercel deploy --prod --yes --scope abduls-projects-551a11d6
```

This is a deliberate choice for now: solo founder, every deploy is intentional. When the team grows past 3 people, install the Vercel GitHub App for auto-deploy on `main` with PR previews.

## 2.4 Build details

- **Framework**: Next.js 14 App Router (Server Components by default).
- **Build command**: `pnpm install --frozen-lockfile && pnpm --filter @elixio/web build` (auto-run by Vercel).
- **Output**: `.vercel/output/` (Next.js standalone build).
- **Node version**: `24.x` (set via `engines.node` in `package.json`).
- **Bundle**: ~90KB shared First Load JS for the homepage. Lighthouse score 95+ for Performance, 100 for Accessibility, Best Practices, SEO.

## 2.5 Verification

After deploy, verify:

1. **Homepage loads**: `https://elixiodigital.com` returns 200 in <2s.
2. **Theme switch works**: click the theme icon, pick dark mode, refresh — theme persists.
3. **Locale switch works**: pick `中文`, refresh — UI shows Simplified Chinese.
4. **Cookie banner shows** on first visit; Accept/Decline persists.
5. **Footer links** to /privacy, /terms, /cookies resolve to 200.
6. **Login form** shows native inputs (text color flips with theme).

## 2.6 Rollback

Vercel keeps the last 10 deployments. To roll back:

1. Vercel dashboard → Deployments → click the last known-good deployment → "Promote to Production".

The CLI also supports: `vercel rollback <deployment-url>`.
