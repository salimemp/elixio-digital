# Step 2 — Deploy the Web (DEPRECATED — Cloudflare Pages)

> **DEPRECATED 2026**: We moved from Cloudflare Pages to Vercel. See [`02-vercel.md`](./02-vercel.md) for the current process.
>
> **Why we left Cloudflare Pages**:
> - `@cloudflare/next-on-pages` (the Next.js adapter for Pages) had persistent build failures with `pnpm 10` + `node-linker=hoisted` monorepo setup.
> - The workaround (switching to `node-linker=isolated` + `public-hoist-pattern[]`) was fragile.
> - Vercel handles the monorepo natively with no adapter.
> - Migration cost: 1 hour. ROI: removed an entire class of build failures.
>
> **When to revisit Cloudflare Pages**:
> - When Vercel's pricing becomes prohibitive (> $20/mo at our scale).
> - When Cloudflare ships native Next.js support without `next-on-pages`.
> - When we want Workers' lower latency for global edge rendering.
>
> This doc is preserved for historical context only. Don't follow it.

## Original guide (kept for reference)

The original Cloudflare Pages deploy setup is below for historical reference. **Do not run these steps for new deploys.**

[Original content follows...]

