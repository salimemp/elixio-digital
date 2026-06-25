# Step 0 — Pre-flight

Before you start, gather these. Most are free signups; only the domain is paid.

## Accounts (all free to create)

- [ ] **GitHub** — you have this. `salimemp/elixio-digital` is already set up.
- [ ] **Railway** — https://railway.app (sign in with GitHub).
- [ ] **Cloudflare** — https://cloudflare.com (sign in with GitHub).
- [ ] **Resend** — https://resend.com (sign in with GitHub).
- [ ] **Expo** — https://expo.dev (sign in with GitHub).
- [ ] **Apple Developer** — https://developer.apple.com ($99/yr, needed before TestFlight).
- [ ] **Google Play Console** — https://play.google.com/console ($25 one-time).
- [ ] **Google Cloud Console** — for Google OAuth credentials.
- [ ] **GitHub OAuth App** — for GitHub OAuth credentials (use https://github.com/settings/developers).

## Domain

- [ ] `elixiodigital.com` is in your account and accessible via Cloudflare DNS. If it's parked at Hostinger, transfer the nameservers to Cloudflare first (see https://developers.cloudflare.com/dns/zone-setups/full-setup/).

## Local prerequisites

- [ ] Node.js 24 (`nvm use` reads `.nvmrc`)
- [ ] pnpm 10.15.0 (`npm i -g pnpm@10.15.0`)
- [ ] `git`, `docker` (for the local Postgres during migration testing), `gh` CLI
- [ ] The repo cloned: `git clone https://github.com/salimemp/elixio-digital.git && cd elixio-digital`

## Local smoke test

Before deploying anywhere, make sure these all pass:

```bash
pnpm install
pnpm db:generate    # generates Prisma client
pnpm typecheck      # all 5 workspaces
pnpm lint           # all 5 workspaces
pnpm build          # web + api + mobile + shared
```

If any fail, do not proceed to deploy. Fix them locally first.

## Generate the secrets you'll need

The API uses two sensitive values that you mint **once** and never rotate in place (rotation requires a re-encryption job, not on the agenda for MVP):

```bash
# JWT signing secret (≥32 chars random)
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 32-byte KEK for envelope-encrypting TOTP seeds and OAuth tokens
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Save these in a password manager (1Password / Bitwarden) under:
- `Elixio Digital / API / JWT_SECRET`
- `Elixio Digital / API / ELIXIO_MFA_KEY_ENCRYPTION_KEY`

You will copy them into Railway (for the API), Cloudflare Pages (for the web if it needs them — usually no), and GitHub Secrets (for the EAS preview build).

## Resend setup

1. Sign in to https://resend.com
2. **Add Domain** → add `elixiodigital.com` (they'll give you DNS records; add them in Cloudflare).
3. **API Keys** → **Create API Key** with "Sending access" permission, scope it to `elixiodigital.com`.
4. Copy the key (`re_…`) into your password manager: `Elixio Digital / Resend API Key`.
5. Note the verified `from` address (e.g., `no-reply@elixiodigital.com`).

## Google OAuth setup

1. https://console.cloud.google.com → **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID** → Application type **Web application**.
2. **Authorized JavaScript origins:** `https://elixiodigital.com`, `https://api.elixiodigital.com`
3. **Authorized redirect URIs:**
   - `https://api.elixiodigital.com/v1/auth/oauth/google/callback`
   - `http://localhost:3000/v1/auth/oauth/google/callback` (for dev)
4. Copy the **Client ID** and **Client secret** into your password manager.

## GitHub OAuth setup

1. https://github.com/settings/developers → **New OAuth App**.
2. **Homepage URL:** `https://elixiodigital.com`
3. **Authorization callback URL:**
   - `https://api.elixiodigital.com/v1/auth/oauth/github/callback`
   - `http://localhost:3000/v1/auth/oauth/github/callback` (for dev)
4. Copy **Client ID** and generate a **client secret** (with "Generate a new client secret"). Save both.

## Once you have everything

Continue to [01-railway.md](./01-railway.md) to deploy the API + database.
