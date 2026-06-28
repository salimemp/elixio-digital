# Testing

> 118 tests across API + web, focused on security and money paths.

---

## Overview

Elixio Digital prioritizes tests for **security-critical** and **money-critical** code paths. We follow the principle: **if it handles auth, passwords, money, or tax, it MUST have tests**. Other code gets integration testing via the running service.

| Surface | Test count | Focus |
| --- | --- | --- |
| API — auth | 18 (role guards) | Defense in depth — JWT vs DB role |
| API — password security | 30 | bcrypt + HIBP + strength + fail-open |
| API — tax | 37 | 41-country calc, multi-slab, rounding, normalization, safety |
| Web — sanitization | 19 | HTML sanitization (XSS vectors) |
| Web — i18n | 13 | Intl formatting for CJK + currency mapping |
| **Total** | **118** | |

Coverage targets:

- ✅ 100% on security/money code paths
- ⚪ Smoke-level on UI components (verified manually + Playwright in dev)
- ⚪ E2E with Playwright (planned, see Roadmap)

## Running tests

```bash
# All tests across the workspace
pnpm test

# Specific package
pnpm --filter @elixio/api test
pnpm --filter @elixio/web test

# Watch mode (for development)
pnpm --filter @elixio/api exec vitest
```

Test framework: **Vitest 2.x**. Tests live next to source as `*.test.ts` files.

## Test structure

Each test file follows the same pattern:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies BEFORE importing the module under test
const findFirstMock = vi.fn();
vi.mock("../lib/prisma.js", () => ({
  prisma: { taxRegion: { findFirst: (...args) => findFirstMock(...args) } },
}));

// Import the module under test (after mocks)
const { calculateTax } = await import("./tax.js");

describe("calculateTax — China VAT slabs", () => {
  beforeEach(() => findFirstMock.mockReset());

  it("applies 13% standard VAT to ¥100", async () => {
    findFirstMock.mockResolvedValueOnce(/* row */);
    const result = await calculateTax(10000, { country: "CN", region: "CN-VAT-13" });
    expect(result.totalTaxCents).toBe(1300);
  });
  // ...
});
```

### Why dynamic import after `vi.mock`?

`vi.mock()` is hoisted by Vitest, so the import must happen AFTER the mock is set up. `await import()` ensures the module loads with mocks in place.

### Why mock Prisma instead of using a real DB?

- **Speed**: 30 password tests run in ~600ms vs ~30s with a real DB round-trip each.
- **Determinism**: No network or DB state to worry about. Each test is hermetic.
- **CI-friendly**: No DB container needed. `pnpm test` runs on any laptop.

For tests that need real DB state (e.g., admin flows that touch multiple tables), we have a Postgres test container via Docker Compose (planned).

## Coverage by file

### `apps/api/src/lib/password-security.test.ts` (30 tests)

- `validatePasswordStrength` (10 tests): length, missing letter/number/special, exact boundaries, multiple issues, whitespace
- `scorePassword` (5 tests): 0-4 score for various lengths and class combinations
- `describeIssue` (3 tests): human-readable messages for each issue code, with/without count
- `checkPwnedPassword` (5 tests): known-breached detection, unique not-found, k-anonymity (only first 5 chars sent), Add-Padding header privacy, network fail-open
- `checkPassword` end-to-end (5 tests): weak, breached, strong, unique, strength-check short-circuit

### `apps/api/src/services/tax.test.ts` (37 tests)

- `calculateTax` basic regional (7 tests): US CA, UK, UAE, Israel, unconfigured country, region fallback, country fallback
- `calculateTax` India GST (5 tests): IN-GST-N format, gstSlab field, default, bare number, GST-N format
- `calculateTax` Brazil auto-stack (1 test): ICMS + PIS/COFINS
- `calculateTax` rounding (3 tests): round up, tiny amounts, zero amounts
- `calculateTax` country normalization (2 tests): uppercase, mixed-case
- `calculateTax` safety (3 tests): malformed address, negative amounts, large amounts
- `listTaxRegions` (2 tests): filter by country, all regions
- `seedTaxRegions` (1 test): upsert count
- `calculateTax` China VAT (7 tests): all 4 slabs, bare number, gstSlab, default
- `calculateTax` Japan consumption tax (3 tests): 10%, 8% reduced, default
- `calculateTax` Korea VAT (2 tests): 10%, no subnational variation
- `seedTaxRegions` (1 test): includes CN/KR/JP

### `apps/api/src/plugins/auth.test.ts` (18 tests)

- `authenticate` (2 tests): delegates to jwtVerify, sends error
- `requireCreator` (6 tests): missing user → 401, admin short-circuit, DB confirm, DB deny (defense in depth), deleted user, JWT isAdmin=true short-circuit
- `requireBuyer` (4 tests): missing user → 401, admin short-circuit, DB confirm, creator denied
- `requireAdmin` (3 tests): not admin → 403, no user → 403, admin pass
- Cross-role defense in depth (2 tests): JWT downgrade caught, JWT upgrade caught

### `apps/web/src/lib/sanitize.test.ts` (19 tests)

- `sanitizeBlogHtml` (12 tests): safe tags preserved, scripts stripped, event handlers stripped, javascript: URIs stripped, data: URIs stripped, iframes stripped, style tags stripped, empty input, https links preserved, mailto links preserved, object/embed stripped, base64 data URIs stripped
- `sanitizeUrl` (7 tests): https, mailto, javascript rejected, data rejected, vbscript rejected, empty, whitespace trim

### `apps/web/src/lib/i18n.test.ts` (13 tests)

- `formatPrice` CJK locales (6 tests): zh CNY, zh-TW TWD, ja JPY, ko KRW, intlTag mapping, fallback
- `currencyForLocale` CJK locales (4 tests): zh, zh-TW, ja, ko
- `formatNumber` CJK locales (3 tests): zh-Hans grouping, ja grouping, ko grouping

## Why we don't have UI tests

UI tests are notoriously brittle (mocking React components, testing styling, etc.) and rarely catch real bugs. We rely on:

1. **Manual QA** — Playwright + browser for visual verification
2. **TypeScript** — catches type errors at build time
3. **Server-side data tests** — ensure the API returns correct data (which the UI then displays)
4. **WCAG contrast scans** — automated via Playwright eval, see `docs/THEME.md`

When we add Playwright E2E (Roadmap §M2), it'll be for **critical user flows only** (register → publish → buy → download).

## Adding new tests

1. Find the file under test (e.g., `apps/api/src/services/foo.ts`).
2. Create `foo.test.ts` next to it.
3. Mock external deps (DB, fetch, etc.) with `vi.mock()`.
4. Use `describe` + `it` blocks.
5. Use `beforeEach` to reset mocks between tests.
6. Aim for:
   - 1 happy-path test
   - 1+ edge case tests (empty, null, boundary)
   - 1+ failure-mode test (for any error path the code handles)
   - Security tests for any auth/permission code

## Reference

- API tests:
  - [`apps/api/src/lib/password-security.test.ts`](./../apps/api/src/lib/password-security.test.ts)
  - [`apps/api/src/services/tax.test.ts`](./../apps/api/src/services/tax.test.ts)
  - [`apps/api/src/plugins/auth.test.ts`](./../apps/api/src/plugins/auth.test.ts)
  - [`apps/api/src/server.test.ts`](./../apps/api/src/server.test.ts)
- Web tests:
  - [`apps/web/src/lib/sanitize.test.ts`](./../apps/web/src/lib/sanitize.test.ts)
  - [`apps/web/src/lib/i18n.test.ts`](./../apps/web/src/lib/i18n.test.ts)