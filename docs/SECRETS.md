# Secrets & Deployment Variables

This doc is the single source of truth for **which secrets go where** in Elixio Digital's CI/CD. Update it the moment you add a new workflow that reads a secret.

> **Rule:** Secrets never live in workflow files, never in `.env` files, never in PR descriptions. They live in **GitHub → Settings → Secrets and variables → Actions**, **Railway → Variables**, or **Vercel → Environment Variables**. Workflows reference them as `${{ secrets.NAME }}`.

## Local dev secrets

Local dev secrets live in `apps/api/.env`. Copy from `apps/api/.env.example` and fill in. The `.env` file is gitignored. Never commit real secrets.

---

## 1. Conventions

- **Prefix:** All Elixio secrets start with `ELIXIO_` (e.g. `ELIXIO_API_URL`, `ELIXIO_ADMIN_TOKEN`). Workflow secrets that target a specific external service use the service prefix (e.g. `CLOUDFLARE_API_TOKEN`, `RAILWAY_TOKEN`).
- **Environments:** Use GitHub Environments (`production`, `staging`) to scope secrets per deploy target. A workflow that deploys to production reads `secrets.ELIXIO_*` only when the `environment: production` is set on the job.
- **Rotation:** Rotate every secret on a fixed cadence (90 days for active tokens, immediately on any suspected leak) and after any contributor leaves.
- **No echo:** Never `${{ secrets.X }}` directly into a log line. Use `::add-mask::` if you have to, but ideally never print the value at all.

## 2. Required secrets (set before first deploy)

| Secret | Used by | Notes |
| --- | --- | --- |
| `ELIXIO_API_URL` | web CI, mobile CI | Base URL of the deployed API. CI uses a placeholder; production uses the real Cloudflare+Railway URL. |
| `ELIXIO_ADMIN_TOKEN` | admin scripts (publish, seed, migrate) | Long-lived **refresh token** for an admin user. Pair with `ELIXIO_ADMIN_EMAIL` only if the token is too short-lived. See §3 for the refresh pattern. |
| `CLOUDFLARE_API_TOKEN` | DNS automation, R2 bucket management | Token scoped to **DNS: Edit** + **R2: Edit** for `elixiodigital.com`. Web deploys go to Vercel (no token needed). |
| `CLOUDFLARE_ACCOUNT_ID` | R2 bucket, future Workers | Account ID of the Cloudflare account. |
| `RAILWAY_TOKEN` | api deploy | Railway API token with `project:deploy` scope. |
| `RAILWAY_PROJECT_ID` | api deploy | Project ID of the API service on Railway. |
| `EAS_TOKEN` | mobile CI (future) | Expo Access Token for non-interactive `eas build` from CI. |
| `RESEND_API_KEY` | api production | Resend API key for transactional email. Free ≤ 3k/mo. |
| `GEMINI_API_KEY` | api production | Google Gemini API key for AI tools. Free tier sufficient at MVP. |
| `ELIXIO_MFA_KEY_ENCRYPTION_KEY` | api production | 32-byte random base64 for AES-256-GCM encryption of TOTP secrets and OAuth tokens. **Generate with**: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `JWT_SECRET` | api production | Random string ≥ 32 chars. **Generate with**: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |

## 3. The `ELIXIO_ADMIN_TOKEN` pattern (long-lived service token)

> This is the pattern the `propdfs` repo uses for the `publish_queued_posts.py` workflow. We adopt the same approach so admin scripts can run from CI without ever storing a password.

The problem: most auth flows issue short-lived access tokens (15 min) + a rotating refresh token. Storing a refresh token in GitHub secrets sounds safe, but if the API rotates the refresh JTI on every refresh (the right default for browser sessions), the stored token becomes stale on the next workflow run.

The fix: the API exposes a `POST /auth/refresh` endpoint that accepts `{"rotate": false}`. When set, the refresh leaves the JTI alone, so the GitHub-stored token stays valid indefinitely. The 7-day TTL still applies; just re-mint once a week.

**Operator flow (one-time):**
1. Manually log in as the admin user (`POST /auth/login`).
2. Use the returned `refreshToken` once with `{"rotate": false}` — confirm the same token is returned in the response.
3. Store the token in GitHub: `gh secret set ELIXIO_ADMIN_TOKEN --repo salimemp/elixio-digital`.
4. Done. The token is now stable for ~7 days, after which the operator repeats steps 1–3.

**Workflow usage:**
```yaml
- name: Run admin script
  env:
    ELIXIO_API_URL: ${{ secrets.ELIXIO_API_URL }}
    ELIXIO_ADMIN_TOKEN: ${{ secrets.ELIXIO_ADMIN_TOKEN }}
  run: |
    set -euo pipefail
    ACCESS=$(curl -sf -X POST "$ELIXIO_API_URL/v1/auth/refresh" \
      -H "Content-Type: application/json" \
      -d "{\"refreshToken\": \"$ELIXIO_ADMIN_TOKEN\", \"rotate\": false}" \
      | jq -r .accessToken)
    # Use $ACCESS as Bearer token for the actual admin call.
```

> The refresh request is `::add-mask::`-able; we mask the secret in the first line of the step.

## 4. Environment-specific overrides

Use **GitHub Environments** when the same workflow needs different values per target:

| Environment | Secrets scope | Use for |
| --- | --- | --- |
| `production` | `ELIXIO_API_URL` (real), all deploy tokens | Deploys that affect users |
| `staging` | `ELIXIO_API_URL` (staging), deploy tokens | Pre-prod verification |
| `ci` (default) | Placeholders only | Every PR + main push |

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production   # ← scopes secrets to the prod environment
    steps:
      - run: deploy.sh
        env:
          ELIXIO_API_URL: ${{ secrets.ELIXIO_API_URL }}
```

## 5. Audit log

Every secret set/rotation should be logged here. Keep one row per event.

| Date | Secret | Action | Operator |
| --- | --- | --- | --- |
| 2026-06-25 | `ELIXIO_API_URL` (placeholder) | initial set | salimemp |
| 2026-06-25 | `ELIXIO_ADMIN_TOKEN` | documented pattern (not yet minted) | salimemp |
