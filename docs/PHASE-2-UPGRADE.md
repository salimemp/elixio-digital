# Phase 2 — React 19 + Next.js 15 + TypeScript 6 + Expo SDK 57 Migration

> **Status:** Planning. **Not started.**
> **Goal:** Bring the monorepo onto a single, modern toolchain. Today we're straddling two stacks because the web app shipped first and Next.js 14 doesn't support React 19.

---

## Why we have the version split today

| Surface | Today | Why |
|---|---|---|
| `apps/web` | Next.js 14.2 + React 18.3 + TS 5.5 | **Live in production.** Next 14 requires React 18. |
| `apps/api` | Fastify 4 + TS 5.5 | No React. |
| `apps/mobile` | Expo SDK 56 + React 19 (intent) + TS 6 (intent) | Expo SDK 56 (Sep 2025) minimum is React 19. Mobile is **not shipped yet.** |
| Root pnpm.overrides | Forces react 18.3 + react-dom 18.3 across the monorepo | Prevents Next 14 from breaking. |
| Root pnpm.overrides | Now also forces typescript 5.9.3 across the monorepo | Prevents drift between web (5.5) and mobile (6.0 bleeding-edge). |

The "intent" versions (React 19 in mobile, TS 6 in mobile) are pinned in `apps/mobile/package.json` but silently overridden by the root `pnpm.overrides` at install time. The lockfile resolves to React 18.3.1 + TS 5.9.3 everywhere. So today everything works — but the package.json lies about what gets installed.

## Risk if we do nothing

1. **`pnpm install --no-frozen-lockfile`** could re-resolve to the unoverridden versions and break mobile.
2. **Lockfile pruning** (pnpm 11+) might drop the overrides under certain flags.
3. **A new contributor** could `rm pnpm-lock.yaml && pnpm install` and get a broken install.
4. **Any future Expo upgrade** that drops React 18 compat would crash without this plan in place.

## Phase 2 plan (single PR when ready)

### 1. Web: Next.js 14 → 15
```diff
- "next": "^14.2.15"
+ "next": "^15.x"        # requires React 19
```
- Server Actions GA in 15 → can drop some `route.ts` boilerplate
- Async `cookies()`, `headers()`, `params` in 15 — every server component needs updating
- React 19 server components: `ref` as prop, no `forwardRef`
- Re-test the creator dashboard, studio, bulk pages — they use `useEffect` + `useState` extensively

**Estimated effort:** 4-6 hours (mostly mechanical refactor + manual test).

### 2. Web: drop React 18 pnpm override
After Next 15 is in, remove from root `pnpm.overrides`:
```diff
- "react": "18.3.1",
- "react-dom": "18.3.1",
```
Now the monorepo resolves to React 19.2.3 (matching mobile's intent).

### 3. Web: bump TS 5.5 → 6
```diff
- "typescript": "^5.5.4"
+ "typescript": "~6.0.x"
```
- TS 6 makes `ignoreDeprecations: "6.0"` no longer needed in mobile tsconfig
- May surface new strict-mode errors — fix case-by-case
- Tailwind config files in apps/web use TS, will need retest

**Estimated effort:** 1-2 hours if no strict-mode regressions, 4-6 if many.

### 4. Mobile: Expo SDK 56 → 57 (when it ships)
Expo SDK 57 is the natural follow-on. Tracks React 19 + new RN release. Hold until SDK 57 is stable (typical: ~3 months after SDK 56 GA).

### 5. Shared package
Already framework-free (just zod + types). No migration needed.

### 6. Cleanup
After migration, remove the `_react_version_note` and `_typescript_version_note` fields from `apps/mobile/package.json` — they're no longer relevant.

## Pre-flight checklist

Before starting:
- [ ] Web app in stable production for ≥ 2 weeks
- [ ] All Vercel deploys green
- [ ] Creator dashboard / studio / bulk all functional
- [ ] No active feature work in flight
- [ ] Backup current `pnpm-lock.yaml`

## Rollback strategy

If Phase 2 ships and breaks:
1. `git revert` the migration PR
2. `pnpm install --frozen-lockfile` reverts to old lock
3. Vercel redeploys from main

All old versions are still pinned in the migration commit, so rollback is mechanical.

---

**Owner:** TBD
**Target quarter:** After creator dashboard launch is validated + 2 weeks of stability.