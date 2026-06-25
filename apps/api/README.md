# @elixio/api

Fastify + Prisma + PostgreSQL API for the Elixio Digital marketplace.

Built for **Node 24** and **pnpm 10.15.0**.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | Secret used to sign JWTs (min 32 chars) |
| `PORT` | no | HTTP port (default: `3000`) |
| `CORS_ORIGIN` | no | CORS origin(s) (default: `http://localhost:3000`) |
| `NODE_ENV` | no | `development` / `production` / `test` (default: `development`) |

Copy `.env.example` to `.env` and fill in real values.

## Commands

```bash
pnpm dev              # run with hot reload (tsx)
pnpm build            # compile TypeScript to dist/
pnpm start            # run compiled app
pnpm lint             # tsc --noEmit
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest run --passWithNoTests
pnpm clean            # remove dist and .turbo
```

## Database

```bash
pnpm db:generate      # generate Prisma client
pnpm db:migrate       # run Prisma migrations
pnpm db:studio        # open Prisma Studio
```

## Deployment

The included `Dockerfile` builds a multi-stage image for Railway. It installs dependencies, generates the Prisma client, compiles TypeScript, and then installs production dependencies in the final stage.
