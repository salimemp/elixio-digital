# Step 2 — Deploy the Web to Cloudflare Pages

This deploys the Next.js web app. End state: `https://elixio-digital.pages.dev` (preview URL) or `https://elixiodigital.com` (custom domain, step 4).

## 2.1 Create the Pages project

1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pick `salimemp/elixio-digital`.
2. **Project name:** `elixio-digital`
3. **Production branch:** `main`
4. **Build settings:**
   - **Framework preset:** `Next.js`
   - **Build command:** `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @elixio/web exec next build`
   - **Build output directory:** `apps/web/.next`
   - **Root directory:** `apps/web` ← **important** — Pages serves from the workspace, but the framework preset expects the app at the root. Use `apps/web` so the relative `cd ../..` lands at the repo root for the `pnpm install`.
5. **Environment variables:** add the public ones (page-2.2 for the full list).

## 2.2 Environment variables (web)

| Variable | Value | Public? |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.elixiodigital.com` | yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | from your password manager | yes (only after you wire Stripe — skip for now) |
| `NODE_VERSION` | `24` | no |
| `PNPM_VERSION` | `10.15.0` | no |

> Use Cloudflare's **environment-specific variables** feature: set `NEXT_PUBLIC_API_URL=https://api.elixiodigital.com` for Production and `http://localhost:3000` for Preview, so PR previews don't hit production.

## 2.3 Build the project

1. **Save and Deploy**. The first build will fail because pnpm is not the default — fix:
2. **Settings** → **Builds** → **Build system** → switch to **Advanced** (or "Custom" if available) so you can override the install command. Set:
   - **Install command:** `pnpm install --frozen-lockfile`
3. **Retry deployment.**
4. Watch the build log. It will run for 3-5 minutes. Look for `Compiled successfully` in the output.

## 2.4 Custom build script (cleaner approach)

If Pages' "Advanced" mode is awkward, add a `package.json` script at the root and call it from the build command:

Already in `apps/web/package.json`:
```json
"pages:build": "pnpm exec next build",
"pages:deploy": "pnpm exec wrangler pages deploy .vercel/output/static"
```

For Pages, use this in the build command:
```
cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @elixio/web run pages:build
```

> This depends on `@cloudflare/next-on-pages` already being installed (it is — see `apps/web/package.json`).

## 2.5 First deploy is the OpenNext era — check Pages compatibility

Cloudflare Pages now prefers **OpenNext** (Workers-based) over the legacy `@cloudflare/next-on-pages` (Pages Functions). If the legacy path errors, switch the project to **OpenNext**:

1. **Settings** → **Builds** → **Build system** → **OpenNext** (if listed).
2. **Build command** for OpenNext:
   ```
   cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @elixio/web exec opennextjs-cloudflare build
   ```
3. Install `opennextjs-cloudflare` in `apps/web` first: `pnpm --filter @elixio/web add -D opennextjs-cloudflare`.

If Pages throws "framework detected: next.js" but won't build, that's the known Pages+Next.js 14 limitation. The fallback is **Cloudflare Workers** (the new "Workers with Static Assets" pattern). See https://developers.cloudflare.com/workers/framework-guides/deploying-nextjs/.

For MVP, the legacy `next-on-pages` path works. Migrate to OpenNext later.

## 2.6 Verify

After the build succeeds:

1. Cloudflare gives you a `*.elixio-digital.pages.dev` URL. Open it.
2. You should see the Elixio Digital landing page.
3. Open the Network tab. `/_next/static/...` assets should load from the Pages edge (not from the origin).
4. Click **Sign in** — the login form renders.

## ✅ Done when

- `https://<your-subdomain>.elixio-digital.pages.dev` loads the home page.
- Sign-in form renders (the form will fail to submit until `NEXT_PUBLIC_API_URL` points to a live API).
- Cloudflare Pages shows "Deployment successful" in the activity log.

## Next

→ [03-eas.md](./03-eas.md) — build the iOS + Android app.
