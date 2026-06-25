# Step 1 — Deploy the API to Railway

This deploys the Fastify API + a managed PostgreSQL database. End state: `https://<railway-subdomain>.up.railway.app` is the API base. We'll point `api.elixiodigital.com` at it in step 4.

## 1.1 Create the project

1. Go to https://railway.app/dashboard
2. **New Project** → **Deploy from GitHub repo** → pick `salimemp/elixio-digital`.
3. When prompted for the service root, set it to `apps/api` (NOT the repo root). The Dockerfile in `apps/api/Dockerfile` is the build target.

   > If Railway's UI doesn't ask for the root, it detected the Dockerfile automatically. Confirm by opening **Settings** → **Service Root** → should be `apps/api`.

4. Railway will start a build. The first build will fail because the env vars aren't set — that's expected. Cancel the auto-deploy and continue.

## 1.2 Add the Postgres service

1. In the same project, **+ New** → **Database** → **PostgreSQL**.
2. Wait for it to provision. Copy the **`DATABASE_URL`** from the Postgres service's **Variables** tab.
3. Go to the API service → **Variables** → **Add Reference** → pick the `DATABASE_URL` from Postgres.

## 1.3 Set the API environment variables

In the API service's **Variables** tab, add the following. **Do not commit any of these to git.**

| Variable | Where to get it | Required for |
| --- | --- | --- |
| `DATABASE_URL` | Reference Postgres service | everything |
| `JWT_SECRET` | From your password manager (≥32 chars) | everything |
| `ELIXIO_MFA_KEY_ENCRYPTION_KEY` | From your password manager (32 bytes base64) | everything |
| `NODE_ENV` | `production` | everything |
| `PORT` | `3000` (Railway overrides this with `$PORT` automatically; set it anyway for clarity) | dev |
| `CORS_ORIGIN` | `https://elixiodigital.com` (comma-separate if you add more) | prod |
| `ELIXIO_API_URL` | `https://api.elixiodigital.com` (we set this after DNS) — for now use the Railway URL | prod |
| `ELIXIO_WEB_URL` | `https://elixiodigital.com` (set after DNS) — for now use `http://localhost:3001` | prod |
| `ELIXIO_MOBILE_URL` | `elixio://` | prod |
| `RESEND_API_KEY` | From your password manager (Resend) | prod |
| `EMAIL_FROM` | `Elixio Digital <no-reply@elixiodigital.com>` (must be the verified sender) | prod |
| `GOOGLE_CLIENT_ID` | From your password manager (Google Cloud) | prod |
| `GOOGLE_CLIENT_SECRET` | From your password manager (Google Cloud) | prod |
| `GITHUB_CLIENT_ID` | From your password manager (GitHub OAuth App) | prod |
| `GITHUB_CLIENT_SECRET` | From your password manager (GitHub OAuth App) | prod |
| `ELIXIO_WEBAUTHN_RP_ID` | `elixiodigital.com` | prod |
| `ELIXIO_WEBAUTHN_ORIGINS` | `https://elixiodigital.com,https://api.elixiodigital.com` | prod |

> **For first deploy only:** set `ELIXIO_API_URL` and `ELIXIO_WEB_URL` to placeholder values. We'll update them after DNS is wired in step 4.

## 1.4 Configure build & deploy

In the API service **Settings**:

- **Build Command:** leave default (Dockerfile in `apps/api/Dockerfile`).
- **Start Command:** leave default (`node dist/server.js`).
- **Healthcheck Path:** `/v1/health` (matches the Fastify route).
- **Healthcheck Timeout:** 300s (first boot is slow — Prisma + bcrypt).
- **Restart Policy:** `ON_FAILURE` with `MAX_RETRIES=10`.
- **Region:** pick the closest to your users. For now: `us-west1` or `eu-west1`.

## 1.5 Trigger a deploy

1. Click **Deploy** (or push a commit to `main` — Railway auto-deploys on push).
2. Watch the logs. The first build takes ~3-5 minutes (`pnpm install` is the bottleneck).
3. When the deploy finishes, the **Logs** tab should show `Server listening at …`.
4. Click the Railway-provided URL (looks like `https://elixio-api-production.up.railway.app`).
5. Append `/v1/health` — you should get `{"status":"ok"}`.

## 1.6 Run the database migration

The API's Dockerfile runs `prisma generate` during build, but **does not run migrations** (we don't want migrations to be coupled to deploys). Run them manually:

```bash
# From your laptop, with the Railway DATABASE_URL set
DATABASE_URL="postgresql://..." pnpm --filter @elixio/api exec prisma migrate deploy
```

Or use Railway's **one-off command** feature: in the API service → **Deployments** → ⋯ menu on the latest → **Run Command** → `pnpm --filter @elixio/api exec prisma migrate deploy`. This is the safer option (no need to copy the DATABASE_URL to your laptop).

## 1.7 Bootstrap the admin

Still in the API service on Railway, **Run Command**:

```bash
pnpm --filter @elixio/api exec tsx scripts/bootstrap-admin.ts <email> <password>
```

For example:

```bash
pnpm --filter @elixio/api exec tsx scripts/bootstrap-admin.ts admin@elixiodigital.com 'pick-a-long-password'
```

The output will print:

```
════════════════════════════════════════════════════════════════
  ✓ Elixio Digital admin bootstrapped
════════════════════════════════════════════════════════════════
  User:    admin@elixiodigital.com
  ELIXIO_DIGITAL_ADMIN_TOKEN=<a-very-long-hex-string>
  Expires: 2026-07-09T… (14 days)
```

Copy the `ELIXIO_DIGITAL_ADMIN_TOKEN` value. You'll add it to GitHub Secrets in step 5.

> The token is also stored in the database. If you lose it, re-run the script with `--print-only <email>` to mint a new one (it revokes all existing tokens for that user, so pick a non-disruptive moment).

## 1.8 Verify

From your laptop:

```bash
# Health check
curl https://<railway-subdomain>.up.railway.app/v1/health

# Should return
{"status":"ok"}
```

## ✅ Done when

- `https://<railway-subdomain>.up.railway.app/v1/health` returns `ok`.
- The first admin user exists and the bootstrap token is saved in your password manager.
- The Prisma migration is applied (`SELECT count(*) FROM users;` in a Postgres client returns at least 1).

## Next

→ [02-cloudflare-pages.md](./02-cloudflare-pages.md) — deploy the web app.
