# Step 5 — Secrets

Different secrets live in different places. This doc is the single source of truth for **what goes where**.

## 5.1 GitHub Secrets

URL: https://github.com/salimemp/elixio-digital/settings/secrets/actions

Add these (use the same names in any CI script that reads them):

| Secret | Value | Used by |
| --- | --- | --- |
| `ELIXIO_DIGITAL_ADMIN_TOKEN` | From `bootstrap-admin.ts` (the long refresh token) | admin workflows, manual ops |
| `ELIXIO_API_URL` | `https://api.elixio.digital` | deploy jobs that hit the API |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → Edit Cloudflare Pages | Cloudflare Pages deploys |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Workers & Pages → right sidebar | Cloudflare Pages deploys |
| `RAILWAY_TOKEN` | Railway → Account Settings → Tokens → Create | Railway deploys (used by the example workflow if you add one) |
| `EAS_TOKEN` | Expo → Account Settings → Access Tokens | EAS builds from CI |

> `CLOUDFLARE_API_TOKEN` is the most common gotcha. When you create it, scope it to `Account / Cloudflare Pages: Edit` for the `elixio-digital` project only. Don't use the global API key.

To add a secret via CLI:

```bash
GH_TOKEN="$(gh config get -h github.com oauth_token 2>/dev/null)" \
  gh secret set ELIXIO_DIGITAL_ADMIN_TOKEN --repo salimemp/elixio-digital
```

Paste the value when prompted (or pipe it: `echo "$VALUE" | gh secret set ...`).

## 5.2 Railway Variables

These are set in the Railway dashboard, **not** GitHub Secrets. See [01-railway.md](./01-railway.md) for the full list. The most critical:

- `JWT_SECRET` — the API signing key. Treat as production secret.
- `ELIXIO_MFA_KEY_ENCRYPTION_KEY` — the KEK for TOTP/OAuth envelope encryption. Loss of this = loss of all TOTP seeds and OAuth tokens. **Back it up in your password manager.**
- `DATABASE_URL` — auto-populated by Railway's Postgres service.
- `GOOGLE_CLIENT_SECRET` / `GITHUB_CLIENT_SECRET` — OAuth provider secrets. Treat as production.

## 5.3 Cloudflare Pages Variables

The web app needs only public values (the `NEXT_PUBLIC_` prefix). See [02-cloudflare-pages.md](./02-cloudflare-pages.md) for the full list.

## 5.4 EAS Secrets

EAS secrets go in `eas.json` per profile. Production secrets stay out of the repo — pass them via `eas build --env-file .env.production` or the Expo dashboard.

## 5.5 The bootstrap admin token rotation

The `ELIXIO_DIGITAL_ADMIN_TOKEN` is a **refresh token** that lasts 14 days. The pattern in this repo calls `/v1/auth/refresh` with `rotate: false` so the stored token stays valid across workflow runs.

When the token expires (or you suspect a leak):

```bash
# From your laptop
DATABASE_URL="postgresql://..." \
  pnpm --filter @elixio/api exec tsx scripts/bootstrap-admin.ts \
    admin@elixio.digital 'your-password' --print-only
```

This revokes all existing refresh tokens for that admin and prints a new one. Save the new value to GitHub Secrets.

Set a calendar reminder for **13 days from today** to rotate. Or — better — set up a GitHub Actions cron that pings you on day 12 if a fresh token hasn't been minted.

## 5.6 Audit log

Track secret changes in [docs/SECRETS.md](../SECRETS.md#audit-log). One row per event.

## ✅ Done when

- `gh secret list --repo salimemp/elixio-digital` shows all 6 secrets above.
- Railway shows green checkmarks for all variables.
- The first EAS preview build has the right `EXPO_PUBLIC_API_URL`.
- The audit log in `docs/SECRETS.md` has today's entries.

## 🎉 You're deployed

If all 5 steps are checked, you have a live Elixio Digital:

- **Web:** https://elixio.digital
- **API:** https://api.elixio.digital/v1/health
- **Mobile:** installable via EAS preview link
- **Admin:** sign in with the email/password you bootstrapped, then go to `/auth/mfa-setup` to enroll a TOTP app (highly recommended)
- **CI:** every PR to `main` runs typecheck + lint + build; merges are blocked until green
- **Branch protection:** `lint, typecheck, build` must be green, 1 approving review required (auto-skip for the solo founder via admin override)

Next on the roadmap: write the first real Prisma migration beyond auth, wire Stripe Checkout, seed the first 5 creators.
