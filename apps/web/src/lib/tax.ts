/**
 * Client for /tax endpoints.
 */

import { api } from "./api";

export interface BillingAddress {
  country: string;
  region?: string;
  postalCode?: string;
}

export interface TaxLine {
  kind: string;
  label: string;
  region: string | null;
  rate: number;
  amountCents: number;
  baseCents: number;
}

export interface TaxResult {
  baseCents: number;
  totalTaxCents: number;
  lines: TaxLine[];
  currency: string;
  resolvedCountry: string;
  resolvedRegion: string;
  rateFound: boolean;
  suggestions?: string[];
}

export interface TaxRegion {
  id: string;
  country: string;
  region: string;
  label: string;
  kind: string;
  rate: string; // Decimal as string
  currency: string;
  description: string | null;
}

export async function calculateTax(
  baseCents: number,
  address: BillingAddress
): Promise<TaxResult> {
  return api<TaxResult>("/tax/calculate", {
    method: "POST",
    body: { baseCents, address },
  });
}

export async function listTaxRegions(country?: string): Promise<{ regions: TaxRegion[] }> {
  const path = country ? `/tax/regions?country=${encodeURIComponent(country)}` : "/tax/regions";
  return api(path);
}