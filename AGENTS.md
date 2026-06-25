# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Elixio Digital — cross-platform creator marketplace (web + mobile + API). TypeScript monorepo managed with pnpm workspaces + Turborepo.

## Toolchain

- Node.js >= 24 (see `.nvmrc`)
- pnpm 10.15.0
- Expo SDK 56 / React Native 0.85 / React 19.2.3

## Essential commands

```bash
pnpm install              # install all workspace deps
pnpm dev                  # run web + mobile + api together
pnpm dev:web              # Next.js only
pnpm dev:mobile           # Expo only
pnpm dev:api              # Fastify API only
pnpm build                # build all
pnpm lint                 # lint all
pnpm typecheck            # type-check all  (RUN THIS after editing TS files)
pnpm test                 # run all tests
pnpm db:generate          # prisma generate
pnpm db:migrate           # prisma migrate dev
pnpm db:studio            # prisma studio
```

## Deployment

- **API** is deployed to **Railway** using `apps/api/Dockerfile` with a managed PostgreSQL service.
- **Web** is deployed to **Cloudflare Pages** using `@cloudflare/next-on-pages`:
  - `pnpm --filter @elixio/web pages:build` → outputs `.vercel/output/static`
  - `pnpm --filter @elixio/web pages:deploy`
- **Mobile** builds are handled by **EAS / Expo**:
  - `pnpm --filter @elixio/mobile build`

Always run `pnpm typecheck` and `pnpm lint` after making changes. They are required to pass before any change is considered complete.

## Architecture rules

- Web (`apps/web`) = Next.js 14 App Router. Server Components by default; use `"use client"` only when needed.
- Mobile (`apps/mobile`) = Expo Router (file-based). Keep components in `components/`, navigation in `app/`.
- API (`apps/api`) = Fastify + Prisma. Routes in `src/routes/`, services in `src/services/`. Validate input with Zod schemas from `@elixio/shared`.
- Shared logic lives in `packages/shared` — types, Zod schemas, constants. Import via `@elixio/shared`.
- Never duplicate types across apps; import from `@elixio/shared`.
- Keep **creator** and **buyer** concerns separate: use `requireCreator` / `requireAdmin` guards in the API, separate navbar sections in the web app, and separate profile/dashboard spaces in mobile.
- Database access only through Prisma client; never raw SQL except in documented migrations.

## Conventions

- TypeScript strict mode everywhere.
- No `any`. Use `unknown` + narrow, or proper types.
- No comments unless explicitly requested.
- Use named exports.
- File naming: `kebab-case.ts` for modules, `PascalCase.tsx` for components.
- Env vars: never commit secrets. Use `.env.example` as the template.
