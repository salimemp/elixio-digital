# @elixio/web

Next.js 14 web application for the Elixio Digital creator marketplace.

## Getting started

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

## Scripts

- `pnpm dev` — start the Next.js development server
- `pnpm build` — build the Next.js application
- `pnpm lint` — run ESLint
- `pnpm typecheck` — run TypeScript without emitting
- `pnpm pages:build` — build for Cloudflare Pages with `@cloudflare/next-on-pages`
- `pnpm pages:deploy` — deploy the built output to Cloudflare Pages
