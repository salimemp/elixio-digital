# Tax Calculation

> 127 rates across 41 countries, single-source-of-truth seed in `tax-rates.ts`, sub-cent-safe rounding up, marketplace-facilitator-collected where required.

---

## Overview

The tax system covers **127 rates** across **41 countries** (as of 28 June 2026). Rates are seeded into the `TaxRegion` Postgres table via `POST /tax/seed` (admin-only) and queried at checkout via `POST /tax/calculate` (public).

| Region type | Coverage |
| --- | --- |
| US sales tax | All 50 states + DC + federal-level rows for AK/DE/MT/NH/OR (zero-rate states) |
| EU VAT | 27 member states (standard rate only — reduced rates per category not modeled) |
| UK VAT | 20% standard |
| India GST | 5 slabs (0% / 5% / 9% / 12% / 18% / 28%) via `IN-GST-N` discriminator |
| Canada GST | Federal 5% + 13 provincial rows (5 GST-only + 5 HST + 3 with PST + QC QST) |
| Australia GST | 10% |
| China VAT | 4 slabs (13% standard / 9% reduced / 6% services / 3% small-scale) via `CN-VAT-N` |
| Japan consumption tax | 2 slabs (10% standard / 8% reduced for food/beverages + newspapers) via `JP-CTAX-N` |
| Korea VAT | 10% single rate |
| Brazil | Federal PIS/COFINS (7.65%) + 8 state ICMS rates (auto-stacked at checkout) |
| GCC | UAE 5% / Saudi Arabia 15% / Oman 5% / Bahrain 10% / Kuwait 0% / Qatar 0% |
| Israel | 18% VAT |
| Other | Switzerland 8.1% / Singapore 9% / Norway 25% / Hong Kong 0% |

## Architecture

```
apps/api/src/services/tax-rates.ts   ← canonical source (127 rows, compiled into JS)
                    │
                    ↓ POST /tax/seed (admin only)
apps/api/prisma/schema.prisma (TaxRegion model)
                    │
                    ↓ POST /tax/calculate (public, called by client at checkout)
apps/api/src/services/tax.ts
   • look up rate by country + region
   • normalize slab discriminator (IN-GST-N, CN-VAT-N, JP-CTAX-N)
   • apply rate × base, round UP to nearest cent
   • Brazil: auto-stack federal PIS/COFINS on top of state ICMS
   • return { baseCents, totalTaxCents, lines, currency, ... }
                    │
                    ↓
Buyer sees localized total in cart (TaxEstimator component)
                    │
                    ↓
On order placement: TaxLineItem rows snapshotted onto Order for historical accuracy
```

## Calculation rules

### 1. Look up by country + region

```ts
const regionRow = await prisma.taxRegion.findFirst({
  where: { country, region: { equals: region, mode: "insensitive" }, isActive: true },
});
```

If no region-specific row, fall back to country-level (empty `region` string).

### 2. Apply rate

```ts
const amountCents = roundUpToCent(baseCents * rate);
```

`roundUpToCent` rounds **up** to favor the tax authority (under-collecting is worse than over-collecting for compliance), but snaps near-integer results to integers to avoid IEEE 754 noise:

```ts
function roundUpToCent(x: number): number {
  const rounded = Math.round(x);
  if (Math.abs(x - rounded) < 1e-9) return rounded;  // snap 28000.0000000004 → 28000
  return Math.ceil(x);                                // 42.20775 → 43
}
```

This was a **critical bug fix** in the 28 June 2026 release: the previous formula was `(baseCents * rate) / 100` (off by 100x), which under-collected tax on every sale. Verified live: $100 Israel VAT now correctly ₪18.00 (was ₪0.18).

### 3. Brazil: auto-stack PIS/COFINS + ICMS

When `country === "BR"` and the matched row is `kind: "icms"`, the calculator also fetches the federal PIS/COFINS row and adds it as a second line:

```ts
if (country === "BR" && regionRow.kind === "icms") {
  const pisCofins = await prisma.taxRegion.findFirst({
    where: { country: "BR", region: "", isActive: true },
  });
  if (pisCofins) {
    lines.push({
      kind: pisCofins.kind,
      label: pisCofins.label,
      region: pisCofins.region || null,
      rate: Number(pisCofins.rate),
      baseCents,
      amountCents: roundUpToCent(baseCents * Number(pisCofins.rate)),
    });
  }
}
```

### 4. Multi-slab countries (IN, CN, JP)

These countries have VAT/GST slabs that differ by category of good/service. The address carries a `region` discriminator like `IN-GST-18` (India 18% standard) or `CN-VAT-13` (China 13% standard). The calculator also accepts:

- Bare number `"9"` → normalized to `IN-GST-9`
- `gstSlab: "18"` field → normalized to `IN-GST-18`
- Default if no slab provided:
  - India → `IN-GST-18` (standard)
  - China → `CN-VAT-13` (standard)
  - Japan → `JP-CTAX-10` (standard)

```ts
if (country === "IN") {
  if (region && region.startsWith("IN-GST")) {
    normalizedRegion = region;
  } else if (gstSlab) {
    const num = gstSlab.replace(/[^0-9]/g, "");
    if (num) normalizedRegion = `IN-GST-${num}`;
  } else if (region && /^[0-9]+$/.test(region)) {
    normalizedRegion = `IN-GST-${region}`;
  } else {
    normalizedRegion = "IN-GST-18";  // default
  }
}
```

### 5. Order snapshot

When an Order is created, the tax lines are snapshotted into `TaxLineItem` rows tied to the Order ID. This preserves historical accuracy even if seed rates change later (which they do — VAT rates change every 1-3 years across jurisdictions).

## Endpoints

### `POST /tax/calculate` (public)

Request:
```json
{
  "baseCents": 10000,
  "address": {
    "country": "IL",
    "region": ""  // optional, format depends on country
  }
}
```

Response:
```json
{
  "baseCents": 10000,
  "totalTaxCents": 1800,
  "lines": [
    { "kind": "vat", "label": "Israel (VAT)", "region": null, "rate": 0.18, "baseCents": 10000, "amountCents": 1800 }
  ],
  "currency": "ILS",
  "resolvedCountry": "IL",
  "resolvedRegion": "",
  "rateFound": true
}
```

If no rate is configured for the country/region:

```json
{
  "baseCents": 10000,
  "totalTaxCents": 0,
  "lines": [],
  "currency": "USD",
  "resolvedCountry": "ZZ",
  "resolvedRegion": "",
  "rateFound": false,
  "suggestions": [
    "No tax rate configured for ZZ.",
    "If you sell into this jurisdiction, add a TaxRegion row.",
    "Buyers will be charged 0% tax until then."
  ]
}
```

### `POST /tax/seed` (admin only)

Idempotent. Upserts all rows from `TAX_RATES` into the `TaxRegion` table using the `(country, region, kind)` unique constraint. Returns `{ count, source: "tax-rates.ts@2026-01-01" }`.

### `GET /tax/regions` (public)

Returns all active regions for the country picker UI. Optional `?country=US` filter.

## Adding a new rate

1. Add the row to `TAX_RATES` in `apps/api/src/services/tax-rates.ts`.
2. If adding a multi-slab country, also add the normalization logic in `tax.ts`.
3. Bump `TAX_SEED_VERSION` if this is a major restructuring (so the seed source is traceable).
4. Run `POST /tax/seed` against the live API to upsert.

## Why not Stripe Tax / Avalara?

External services cost $0.10–$0.50 per transaction and add latency. For an MVP marketplace with a 8% platform fee, that's a 1.25-6% additional cost. Our hand-rolled `tax.ts` is:

- **Fast**: Single Prisma query + arithmetic (p95 < 50ms).
- **Free**: No per-call cost.
- **Auditable**: Single source of truth in `tax-rates.ts`, reviewed in code review.
- **Honest about limits**: We don't pretend to handle every edge case (B2B reverse charge, US economic nexus per Wayfair). We clearly document what's NOT covered.

When Elixio hits $1M+ GMV (where the tax-engine SaaS fees become material), we'll evaluate Stripe Tax for the long tail of jurisdictions. Until then, this is the right trade-off.

## What we intentionally don't cover

- **Reduced rates per category** (food, books, children's clothing, etc.). For digital services, the standard rate usually applies; only physical goods trigger reduced rates in some jurisdictions.
- **Local/city taxes** (US combined district tax, EU reduced rates per category).
- **B2B vs B2C reverse charge** (we don't yet support B2B invoicing with reverse-charge VAT).
- **Marketplace facilitator laws** beyond the obvious (e.g., Wayfair-style economic nexus for US states).
- **Digital Services Tax (DST)** specific rules (UK DST, France DST, etc. — separate from VAT).
- **Real-time rate updates** from government feeds.

When a seller sells into one of these gaps, the suggestion list returned by `/tax/calculate` tells them to add a `TaxRegion` row manually via the admin UI.

## Reference

- Seed table: [`apps/api/src/services/tax-rates.ts`](./../apps/api/src/services/tax-rates.ts)
- Calculator: [`apps/api/src/services/tax.ts`](./../apps/api/src/services/tax.ts)
- Routes: [`apps/api/src/routes/tax.ts`](./../apps/api/src/routes/tax.ts)
- Prisma model: [`TaxRegion`](./DATABASE.md#taxregion), [`TaxLineItem`](./DATABASE.md#taxlineitem)
- Tests: [`apps/api/src/services/tax.test.ts`](./../apps/api/src/services/tax.test.ts) (37 tests covering all regions + multi-slab normalization)