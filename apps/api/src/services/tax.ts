import { prisma } from "../lib/prisma.js";
import type { TaxKind } from "@prisma/client";
import { TAX_RATES, TAX_SEED_VERSION, TAX_SEED_LAST_VERIFIED } from "./tax-rates.js";

export interface BillingAddress {
  country: string; // ISO 3166-1 alpha-2
  region?: string; // ISO 3166-2 subdivision or empty for country-level
  postalCode?: string;
}

export interface TaxLineResult {
  kind: TaxKind;
  label: string;
  region: string | null;
  rate: number;
  /** Amount in cents (positive integer) */
  amountCents: number;
  /** Base amount this tax was computed from (in cents) */
  baseCents: number;
}

export interface TaxCalculationResult {
  /** Input amount in cents */
  baseCents: number;
  /** Total tax across all lines, in cents */
  totalTaxCents: number;
  /** Per-line breakdown — usually 1 line, sometimes 2 (e.g. federal + state) */
  lines: TaxLineResult[];
  /** Currency the calculation is denominated in */
  currency: string;
  /** ISO country + region code used to look up the rate */
  resolvedCountry: string;
  resolvedRegion: string;
  /** True if any rate was found; false if a fallback (0%) was used */
  rateFound: boolean;
  /** If no rate was found, suggestions for the buyer to verify */
  suggestions?: string[];
}

/**
 * Compute tax for a purchase based on the buyer's billing address.
 *
 * Algorithm:
 *   1. Look up the matching TaxRegion row by country + region + kind
 *   2. If region is set and not found, fall back to country-level rate
 *   3. If country-level rate is also missing, return 0% with a
 *      suggestion to the buyer (no tax jurisdiction for that country
 *      in our seed yet)
 *   4. Apply rate to baseCents. For sub-cent precision we round up
 *      (favors the tax authority; rounding down would under-collect).
 */
export async function calculateTax(
  baseCents: number,
  address: BillingAddress
): Promise<TaxCalculationResult> {
  const country = address.country.toUpperCase();
  const region = (address.region ?? "").toUpperCase();
  const gstSlab = (address as BillingAddress & { gstSlab?: string }).gstSlab?.toUpperCase();

  // For India: the region discriminator IS the GST slab (IN-GST-18 = 18%).
  // The address.region field carries the slab directly; we accept either
  // format ("IN-GST-18" or just "GST-18" or "18") and normalize.
  let normalizedRegion = region;
  if (country === "IN") {
    if (region && region.startsWith("IN-GST")) {
      normalizedRegion = region;
    } else if (gstSlab) {
      // gstSlab like "18" or "GST-18" → "IN-GST-18"
      const num = gstSlab.replace(/[^0-9]/g, "");
      if (num) normalizedRegion = `IN-GST-${num}`;
    } else if (region && /^[0-9]+$/.test(region)) {
      // Bare number as region — interpret as slab
      normalizedRegion = `IN-GST-${region}`;
    } else {
      // Default to 18% (standard) when no slab provided
      normalizedRegion = "IN-GST-18";
    }
  }

  // Try region-specific first (or IN-GST-N for India)
  let regionRow = null;
  if (normalizedRegion) {
    regionRow = await prisma.taxRegion.findFirst({
      where: { country, region: { equals: normalizedRegion, mode: "insensitive" }, isActive: true },
    });
  }
  // Fall back to country-level (only if no region was provided AND we don't have an India row)
  if (!regionRow && !normalizedRegion) {
    regionRow = await prisma.taxRegion.findFirst({
      where: { country, region: "", isActive: true },
    });
  }

  if (!regionRow) {
    return {
      baseCents,
      totalTaxCents: 0,
      lines: [],
      currency: "USD",
      resolvedCountry: country,
      resolvedRegion: region,
      rateFound: false,
      suggestions: [
        `No tax rate configured for ${country}${region ? ` / ${region}` : ""}.`,
        "If you sell into this jurisdiction, add a TaxRegion row.",
        "Buyers will be charged 0% tax until then.",
      ],
    };
  }

  const rate = Number(regionRow.rate);
  // For India: if buyer is in a different state than the seller, IGST applies.
  // For all others: standard rate.
  const lines: TaxLineResult[] = [
    {
      kind: regionRow.kind,
      label: regionRow.label,
      region: regionRow.region || null,
      rate,
      baseCents,
      // Round UP to the nearest cent so we don't under-collect on
      // fractional cents. (5.5% × $9.99 = $0.5495 → round to $0.55)
      amountCents: Math.ceil((baseCents * rate) / 100),
    },
  ];

  // Special case: India intra-state splits into CGST + SGST
  // (each is half the rate). For now we keep it as a single IGST line
  // and let the seller manually split via the admin UI when invoicing.
  // Future: detect seller state vs buyer state to split.

  // Special case: Brazil PIS/COFINS is federal on top of state ICMS
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
        amountCents: Math.ceil((baseCents * Number(pisCofins.rate)) / 100),
      });
    }
  }

  return {
    baseCents,
    totalTaxCents: lines.reduce((s, l) => s + l.amountCents, 0),
    lines,
    currency: regionRow.currency,
    resolvedCountry: country,
    resolvedRegion: regionRow.region,
    rateFound: true,
  };
}

/**
 * Return all available tax regions (for the country picker UI).
 */
export async function listTaxRegions(filterCountry?: string) {
  const where = filterCountry
    ? { country: filterCountry.toUpperCase(), isActive: true }
    : { isActive: true };
  return prisma.taxRegion.findMany({
    where,
    orderBy: [{ country: "asc" }, { region: "asc" }],
    select: {
      id: true,
      country: true,
      region: true,
      label: true,
      kind: true,
      rate: true,
      currency: true,
      description: true,
    },
  });
}

/**
 * Seed the TaxRegion table from the canonical rate list. Idempotent:
 * uses the (country, region, kind) unique constraint for upsert.
 * Returns the number of rows written/updated.
 */
export async function seedTaxRegions(): Promise<{ count: number; source: string }> {
  let count = 0;
  for (const row of TAX_RATES) {
    await prisma.taxRegion.upsert({
      where: {
        country_region_kind: {
          country: row.country,
          region: row.region,
          kind: row.kind,
        },
      },
      create: {
        country: row.country,
        region: row.region,
        label: row.label,
        kind: row.kind,
        rate: row.rate,
        currency: row.currency,
        description: row.description,
        sourceUrl: row.sourceUrl,
        lastVerified: TAX_SEED_LAST_VERIFIED,
      },
      update: {
        label: row.label,
        rate: row.rate,
        currency: row.currency,
        description: row.description,
        sourceUrl: row.sourceUrl,
        lastVerified: TAX_SEED_LAST_VERIFIED,
      },
    });
    count++;
  }
  return { count, source: `tax-rates.ts@${TAX_SEED_VERSION}` };
}