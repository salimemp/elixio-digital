# Deploying Elixio Digital

This is the master deployment guide. Read it first, then follow the per-platform runbook:

| Step | Doc | What it does |
| --- | --- | --- |
| 0 | [Pre-flight](./deploy/00-preflight.md) | Domain, accounts, secrets checklist |
| 1 | [Railway (API + Postgres)](./deploy/01-railway.md) | The Fastify API + managed Postgres |
| 2 | [Cloudflare Pages (Web)](./deploy/02-cloudflare-pages.md) | The Next.js web app |
| 3 | [EAS (Mobile)](./deploy/03-eas.md) | iOS + Android builds |
| 4 | [DNS + domain](./deploy/04-dns-domain.md) | `elixio.digital` → Pages, `api.elixio.digital` → Railway |
| 5 | [Secrets](./deploy/05-secrets.md) | What goes in GitHub Secrets vs Railway vs Cloudflare |

## Architecture (after deploy)

```
                       ┌────────────────────┐
                       │  Cloudflare Pages  │
                       │  elixio.digital    │
                       │  (Next.js 14 web)  │
                       └─────────┬──────────┘
                                 │ HTTPS
            ┌────────────────────┼─────────────────────┐
            │                    │                     │
            ▼                    ▼                     ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐
   │  Expo mobile    │  │  Cloudflare      │  │  Cloudflare      │
   │  iOS / Android  │  │  (DNS, Pages)    │  │  R2 (asset files)│
   └────────┬────────┘  └─────────────────┘  └──────────────────┘
            │ HTTPS
            ▼
   ┌────────────────────┐         ┌────────────────────┐
   │  Railway           │ ◄──────►│  Railway Postgres  │
   │  api.elixio.digital│         │  (managed)         │
   │  (Fastify + Node)  │         └────────────────────┘
   └────────────────────┘
```

## Order of operations

1. Do the pre-flight.
2. Deploy the API to Railway first. This gives you a URL to point DNS at and a `JWT_SECRET` and `ELIXIO_MFA_KEY_ENCRYPTION_KEY` to share with the web deploy.
3. Wire up DNS so `api.elixio.digital` and `elixio.digital` resolve.
4. Deploy the web to Cloudflare Pages, pointing at the API URL.
5. Build the mobile EAS preview, point it at the same API URL.
6. Set up GitHub Secrets last — these reference the deployed URLs from the previous steps.
7. Run `bootstrap-admin.ts` against the Railway database to mint `ELIXIO_DIGITAL_ADMIN_TOKEN`, then save it in GitHub Secrets.

## Time & cost

| Service | Plan | $/mo |
| --- | --- | ---: |
| Railway (API + Postgres) | Hobby $5 + usage | 5–20 |
| Cloudflare Pages | Free | 0 |
| Cloudflare R2 | Free ≤ 10 GB | 0–5 |
| Resend | Free ≤ 3k/mo | 0 |
| EAS Build (production) | $99/mo (free for dev) | 0–99 |
| Domain | existing | ~1 |
| **Total** | | **~7–125** |

> The MVP cost is under $30/mo. EAS Production ($99/mo) is the only line that scales up when you're shipping real app-store releases.

## What "done" looks like

- `https://elixio.digital` loads the web app.
- `https://api.elixio.digital/v1/health` returns `{ "status": "ok" }`.
- `pnpm i && pnpm typecheck && pnpm lint && pnpm build` is green on `main`.
- CI is green on every PR.
- A new admin can be bootstrapped with `pnpm bootstrap-admin email password`.
- An iOS TestFlight build is available to internal testers via EAS.
- An Android internal testing track is available via Google Play.

If any of those don't hold, walk back through the per-platform runbook.
