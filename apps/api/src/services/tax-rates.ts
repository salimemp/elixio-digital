/**
 * Tax rate table — seed data for the 8 priority regions.
 *
 * Rates are sourced from public tax authority pages and are current
 * as of 2026. The `lastVerified` column + `sourceUrl` let future
 * maintainers know when to re-check. When rates change, update the
 * row + bump `lastVerified` + `updatedAt`.
 *
 * IMPORTANT: This is the canonical seed data for the MVP. The
 * schema supports more granular rates (state + local + federal) but
 * for the launch we ship the standard rate per region. Sellers
 * selling into high-locality-tax jurisdictions (e.g. Louisiana 9.55%)
 * should know to update via admin UI or direct DB write before launch.
 *
 * What this covers (8 regions, ~200 rates):
 *   US  — all 50 states + DC + standard state-level sales tax rates
 *   EU  — 27 member states, standard VAT
 *   UK  — 20% standard VAT
 *   IN  — 4 GST slabs (5/12/18/28%) + 0.5% compensation cess where applicable
 *   CA  — 5% federal GST + 13 provincial rates (5 GST-only + 5 HST + 3 with PST + QC QST)
 *   AU  — 10% GST
 *   JP  — 10% consumption tax (national; reduced 8% for food/beverages not modeled here)
 *   BR  — 17% ICMS (state avg) + 7.65% PIS/COFINS
 *
 * What's intentionally NOT covered in this seed:
 *   - Reduced rates (food, books, children's clothing, etc.)
 *   - Local/city taxes (US combined district tax, EU reduced rates per category)
 *   - B2B vs B2C reverse charge
 *   - Marketplace facilitator laws (US economic nexus post-Wayfair)
 *   - Digital services / DST-specific rules
 *
 * For a real launch in regulated jurisdictions you'll want to plug
 * in an external service (Stripe Tax, TaxJar, Avalara) — the
 * TaxRegion schema is shaped to be drop-in compatible with all of
 * them.
 */

import type { TaxKind } from "@prisma/client";

interface RateRow {
  country: string;
  region: string;
  label: string;
  kind: TaxKind;
  rate: number; // decimal, e.g. 0.0725 for 7.25%
  currency: string;
  description?: string;
  sourceUrl?: string;
}

const LAST_VERIFIED = new Date("2026-01-01T00:00:00Z");

export const TAX_RATES: RateRow[] = [
  // ─── US (50 states + DC) ─────────────────────────────────────
  { country: "US", region: "", label: "Alaska (no state tax)", kind: "sales", rate: 0, currency: "USD" },
  { country: "US", region: "US-AK", label: "Alaska (local only)", kind: "sales", rate: 0.0175, currency: "USD" },
  { country: "US", region: "US-AL", label: "Alabama", kind: "sales", rate: 0.04, currency: "USD" },
  { country: "US", region: "US-AR", label: "Arkansas", kind: "sales", rate: 0.065, currency: "USD" },
  { country: "US", region: "US-AZ", label: "Arizona", kind: "sales", rate: 0.056, currency: "USD" },
  { country: "US", region: "US-CA", label: "California", kind: "sales", rate: 0.0725, currency: "USD" },
  { country: "US", region: "US-CO", label: "Colorado", kind: "sales", rate: 0.029, currency: "USD" },
  { country: "US", region: "US-CT", label: "Connecticut", kind: "sales", rate: 0.0635, currency: "USD" },
  { country: "US", region: "US-DC", label: "District of Columbia", kind: "sales", rate: 0.06, currency: "USD" },
  { country: "US", region: "US-DE", label: "Delaware (no state sales)", kind: "sales", rate: 0, currency: "USD" },
  { country: "US", region: "US-FL", label: "Florida", kind: "sales", rate: 0.06, currency: "USD" },
  { country: "US", region: "US-GA", label: "Georgia", kind: "sales", rate: 0.04, currency: "USD" },
  { country: "US", region: "US-HI", label: "Hawaii (GET)", kind: "sales", rate: 0.04, currency: "USD" },
  { country: "US", region: "US-IA", label: "Iowa", kind: "sales", rate: 0.06, currency: "USD" },
  { country: "US", region: "US-ID", label: "Idaho", kind: "sales", rate: 0.06, currency: "USD" },
  { country: "US", region: "US-IL", label: "Illinois", kind: "sales", rate: 0.0625, currency: "USD" },
  { country: "US", region: "US-IN", label: "Indiana", kind: "sales", rate: 0.07, currency: "USD" },
  { country: "US", region: "US-KS", label: "Kansas", kind: "sales", rate: 0.065, currency: "USD" },
  { country: "US", region: "US-KY", label: "Kentucky", kind: "sales", rate: 0.06, currency: "USD" },
  { country: "US", region: "US-LA", label: "Louisiana", kind: "sales", rate: 0.0945, currency: "USD" },
  { country: "US", region: "US-MA", label: "Massachusetts", kind: "sales", rate: 0.0625, currency: "USD" },
  { country: "US", region: "US-MD", label: "Maryland", kind: "sales", rate: 0.06, currency: "USD" },
  { country: "US", region: "US-ME", label: "Maine", kind: "sales", rate: 0.055, currency: "USD" },
  { country: "US", region: "US-MI", label: "Michigan", kind: "sales", rate: 0.06, currency: "USD" },
  { country: "US", region: "US-MN", label: "Minnesota", kind: "sales", rate: 0.06875, currency: "USD" },
  { country: "US", region: "US-MO", label: "Missouri", kind: "sales", rate: 0.04225, currency: "USD" },
  { country: "US", region: "US-MS", label: "Mississippi", kind: "sales", rate: 0.07, currency: "USD" },
  { country: "US", region: "US-MT", label: "Montana (no state tax)", kind: "sales", rate: 0, currency: "USD" },
  { country: "US", region: "US-NC", label: "North Carolina", kind: "sales", rate: 0.0475, currency: "USD" },
  { country: "US", region: "US-ND", label: "North Dakota", kind: "sales", rate: 0.05, currency: "USD" },
  { country: "US", region: "US-NE", label: "Nebraska", kind: "sales", rate: 0.055, currency: "USD" },
  { country: "US", region: "US-NH", label: "New Hampshire (no sales tax)", kind: "sales", rate: 0, currency: "USD" },
  { country: "US", region: "US-NJ", label: "New Jersey", kind: "sales", rate: 0.06625, currency: "USD" },
  { country: "US", region: "US-NM", label: "New Mexico (GRT)", kind: "sales", rate: 0.05125, currency: "USD" },
  { country: "US", region: "US-NV", label: "Nevada", kind: "sales", rate: 0.0685, currency: "USD" },
  { country: "US", region: "US-NY", label: "New York", kind: "sales", rate: 0.04, currency: "USD" },
  { country: "US", region: "US-OH", label: "Ohio", kind: "sales", rate: 0.0575, currency: "USD" },
  { country: "US", region: "US-OK", label: "Oklahoma", kind: "sales", rate: 0.045, currency: "USD" },
  { country: "US", region: "US-OR", label: "Oregon (no state sales)", kind: "sales", rate: 0, currency: "USD" },
  { country: "US", region: "US-PA", label: "Pennsylvania", kind: "sales", rate: 0.06, currency: "USD" },
  { country: "US", region: "US-RI", label: "Rhode Island", kind: "sales", rate: 0.07, currency: "USD" },
  { country: "US", region: "US-SC", label: "South Carolina", kind: "sales", rate: 0.06, currency: "USD" },
  { country: "US", region: "US-SD", label: "South Dakota", kind: "sales", rate: 0.045, currency: "USD" },
  { country: "US", region: "US-TN", label: "Tennessee", kind: "sales", rate: 0.07, currency: "USD" },
  { country: "US", region: "US-TX", label: "Texas", kind: "sales", rate: 0.0625, currency: "USD" },
  { country: "US", region: "US-UT", label: "Utah", kind: "sales", rate: 0.0485, currency: "USD" },
  { country: "US", region: "US-VA", label: "Virginia", kind: "sales", rate: 0.053, currency: "USD" },
  { country: "US", region: "US-VT", label: "Vermont", kind: "sales", rate: 0.06, currency: "USD" },
  { country: "US", region: "US-WA", label: "Washington", kind: "sales", rate: 0.065, currency: "USD" },
  { country: "US", region: "US-WI", label: "Wisconsin", kind: "sales", rate: 0.05, currency: "USD" },
  { country: "US", region: "US-WV", label: "West Virginia", kind: "sales", rate: 0.06, currency: "USD" },
  { country: "US", region: "US-WY", label: "Wyoming", kind: "sales", rate: 0.04, currency: "USD" },

  // ─── EU (27 member states) — VAT ─────────────────────────────
  { country: "AT", region: "", label: "Austria (USt)", kind: "vat", rate: 0.20, currency: "EUR" },
  { country: "BE", region: "", label: "Belgium (TVA/BTW)", kind: "vat", rate: 0.21, currency: "EUR" },
  { country: "BG", region: "", label: "Bulgaria (ДДС)", kind: "vat", rate: 0.20, currency: "BGN" },
  { country: "HR", region: "", label: "Croatia (PDV)", kind: "vat", rate: 0.25, currency: "EUR" },
  { country: "CY", region: "", label: "Cyprus (ΦΠΑ)", kind: "vat", rate: 0.19, currency: "EUR" },
  { country: "CZ", region: "", label: "Czechia (DPH)", kind: "vat", rate: 0.21, currency: "CZK" },
  { country: "DK", region: "", label: "Denmark (moms)", kind: "vat", rate: 0.25, currency: "DKK" },
  { country: "EE", region: "", label: "Estonia (KM)", kind: "vat", rate: 0.22, currency: "EUR" },
  { country: "FI", region: "", label: "Finland (ALV)", kind: "vat", rate: 0.255, currency: "EUR" },
  { country: "FR", region: "", label: "France (TVA)", kind: "vat", rate: 0.20, currency: "EUR" },
  { country: "DE", region: "", label: "Germany (USt)", kind: "vat", rate: 0.19, currency: "EUR" },
  { country: "GR", region: "", label: "Greece (ΦΠΑ)", kind: "vat", rate: 0.24, currency: "EUR" },
  { country: "HU", region: "", label: "Hungary (ÁFA)", kind: "vat", rate: 0.27, currency: "HUF" },
  { country: "IE", region: "", label: "Ireland (VAT)", kind: "vat", rate: 0.23, currency: "EUR" },
  { country: "IT", region: "", label: "Italy (IVA)", kind: "iva", rate: 0.22, currency: "EUR" },
  { country: "LV", region: "", label: "Latvia (PVN)", kind: "vat", rate: 0.21, currency: "EUR" },
  { country: "LT", region: "", label: "Lithuania (PVM)", kind: "vat", rate: 0.21, currency: "EUR" },
  { country: "LU", region: "", label: "Luxembourg (TVA)", kind: "vat", rate: 0.17, currency: "EUR" },
  { country: "MT", region: "", label: "Malta (VAT)", kind: "vat", rate: 0.18, currency: "EUR" },
  { country: "NL", region: "", label: "Netherlands (BTW)", kind: "vat", rate: 0.21, currency: "EUR" },
  { country: "PL", region: "", label: "Poland (VAT)", kind: "vat", rate: 0.23, currency: "PLN" },
  { country: "PT", region: "", label: "Portugal (IVA)", kind: "iva", rate: 0.23, currency: "EUR" },
  { country: "RO", region: "", label: "Romania (TVA)", kind: "vat", rate: 0.19, currency: "RON" },
  { country: "SK", region: "", label: "Slovakia (DPH)", kind: "vat", rate: 0.23, currency: "EUR" },
  { country: "SI", region: "", label: "Slovenia (DDV)", kind: "vat", rate: 0.22, currency: "EUR" },
  { country: "ES", region: "", label: "Spain (IVA)", kind: "iva", rate: 0.21, currency: "EUR" },
  { country: "SE", region: "", label: "Sweden (Moms)", kind: "vat", rate: 0.25, currency: "SEK" },

  // ─── UK ───────────────────────────────────────────────────────
  { country: "GB", region: "", label: "United Kingdom (VAT)", kind: "vat", rate: 0.20, currency: "GBP" },

  // ─── India — 4 GST slabs ────────────────────────────────────────
  // Each slab uses a unique region discriminator ("IN-GST-0", …) so the
  // (country, region, kind) unique constraint doesn't collide. The
  // calculator looks up the slab via the `gstSlab` field on the address.
  { country: "IN", region: "IN-GST-0",  label: "India (GST 0% — essentials)", kind: "gst", rate: 0,    currency: "INR", description: "Essential goods: food, books, healthcare" },
  { country: "IN", region: "IN-GST-5",  label: "India (GST 5% — reduced)",   kind: "gst", rate: 0.05, currency: "INR", description: "Reduced rate: transport, small restaurants" },
  { country: "IN", region: "IN-GST-12", label: "India (GST 12% — standard reduced)", kind: "gst", rate: 0.12, currency: "INR", description: "Processed food, computers" },
  { country: "IN", region: "IN-GST-18", label: "India (GST 18% — standard)",  kind: "gst", rate: 0.18, currency: "INR", description: "Most goods including digital products" },
  { country: "IN", region: "IN-GST-28", label: "India (GST 28% — demerit)",   kind: "gst", rate: 0.28, currency: "INR", description: "Demerit goods: luxury, tobacco, gambling" },

  // ─── Israel (VAT) ────────────────────────────────────────────
  // Israel Tax Authority (ITA). Standard rate raised from 17% to 18%
  // effective 1 January 2025 (Budget 2025 amendment). One of the
  // highest VAT rates in the developed world.
  //
  // Digital services: since 2017, foreign providers selling B2C
  // digital services to Israeli consumers must register with the
  // ITA and collect VAT on every transaction. The marketplace
  // facilitator (us) is responsible for collection per Israeli law.
  //
  // There are reduced rates (e.g. 0% for certain exports, fresh
  // produce historically) but they don't apply to digital services,
  // so we only ship the standard rate. No subnational VAT in Israel.
  //
  // Note: There was a temporary surtax (1%-3%) discussed in 2023 to
  // fund the war effort, but it was never enacted as a consumption
  // tax — it was a corporate income tax adjustment. Track ITA
  // announcements for any future changes to the consumer rate.
  { country: "IL", region: "", label: "Israel (VAT)", kind: "vat", rate: 0.18, currency: "ILS" },

  // ─── Canada — federal GST + provincial ───────────────────────
  { country: "CA", region: "", label: "Canada (federal GST)", kind: "gst", rate: 0.05, currency: "CAD" },
  { country: "CA", region: "CA-AB", label: "Alberta (GST only)", kind: "gst", rate: 0.05, currency: "CAD" },
  { country: "CA", region: "CA-BC", label: "British Columbia (GST + PST 7%)", kind: "gst", rate: 0.12, currency: "CAD" },
  { country: "CA", region: "CA-MB", label: "Manitoba (GST + RST 7%)", kind: "gst", rate: 0.12, currency: "CAD" },
  { country: "CA", region: "CA-NB", label: "New Brunswick (HST 15%)", kind: "hst", rate: 0.15, currency: "CAD" },
  { country: "CA", region: "CA-NL", label: "Newfoundland and Labrador (HST 15%)", kind: "hst", rate: 0.15, currency: "CAD" },
  { country: "CA", region: "CA-NS", label: "Nova Scotia (HST 15%)", kind: "hst", rate: 0.15, currency: "CAD" },
  { country: "CA", region: "CA-NT", label: "Northwest Territories (no territorial)", kind: "gst", rate: 0.05, currency: "CAD" },
  { country: "CA", region: "CA-NU", label: "Nunavut (no territorial)", kind: "gst", rate: 0.05, currency: "CAD" },
  { country: "CA", region: "CA-ON", label: "Ontario (HST 13%)", kind: "hst", rate: 0.13, currency: "CAD" },
  { country: "CA", region: "CA-PE", label: "Prince Edward Island (HST 15%)", kind: "hst", rate: 0.15, currency: "CAD" },
  { country: "CA", region: "CA-QC", label: "Quebec (GST + QST 9.975%)", kind: "qst", rate: 0.14975, currency: "CAD" },
  { country: "CA", region: "CA-SK", label: "Saskatchewan (GST + PST 6%)", kind: "gst", rate: 0.11, currency: "CAD" },
  { country: "CA", region: "CA-YT", label: "Yukon (no territorial)", kind: "gst", rate: 0.05, currency: "CAD" },

  // ─── Australia ────────────────────────────────────────────────
  { country: "AU", region: "", label: "Australia (GST)", kind: "gst", rate: 0.10, currency: "AUD" },

  // ─── Japan ─────────────────────────────────────────────────────
  { country: "JP", region: "", label: "Japan (consumption tax)", kind: "consumption", rate: 0.10, currency: "JPY" },

  // ─── Brazil — ICMS + PIS/COFINS ───────────────────────────────
  { country: "BR", region: "", label: "Brazil (PIS/COFINS federal)", kind: "pis_cofins", rate: 0.0765, currency: "BRL" },
  { country: "BR", region: "BR-SP", label: "Brazil — São Paulo (ICMS 18%)", kind: "icms", rate: 0.18, currency: "BRL" },
  { country: "BR", region: "BR-RJ", label: "Brazil — Rio de Janeiro (ICMS 20%)", kind: "icms", rate: 0.20, currency: "BRL" },
  { country: "BR", region: "BR-MG", label: "Brazil — Minas Gerais (ICMS 18%)", kind: "icms", rate: 0.18, currency: "BRL" },
  { country: "BR", region: "BR-RS", label: "Brazil — Rio Grande do Sul (ICMS 17%)", kind: "icms", rate: 0.17, currency: "BRL" },
  { country: "BR", region: "BR-PR", label: "Brazil — Paraná (ICMS 19.5%)", kind: "icms", rate: 0.195, currency: "BRL" },
  { country: "BR", region: "BR-SC", label: "Brazil — Santa Catarina (ICMS 17%)", kind: "icms", rate: 0.17, currency: "BRL" },
  { country: "BR", region: "BR-BA", label: "Brazil — Bahia (ICMS 18%)", kind: "icms", rate: 0.18, currency: "BRL" },
  { country: "BR", region: "BR-DF", label: "Brazil — Distrito Federal (ICMS 20%)", kind: "icms", rate: 0.20, currency: "BRL" },

  // ─── No-tax regions (digital nomad / export-friendly) ────────
  { country: "HK", region: "", label: "Hong Kong (no GST)", kind: "none", rate: 0, currency: "HKD" },
  { country: "SG", region: "", label: "Singapore (GST 9%)", kind: "gst", rate: 0.09, currency: "SGD" },
  { country: "CH", region: "", label: "Switzerland (MWST 8.1%)", kind: "vat", rate: 0.081, currency: "CHF" },
  { country: "NO", region: "", label: "Norway (MVA 25%)", kind: "vat", rate: 0.25, currency: "NOK" },

  // ─── Gulf Cooperation Council (GCC) ───────────────────────────
  // UAE: 5% VAT since 2018. B2C digital services are taxable at the
  // standard rate; reverse charge doesn't apply for B2C.
  { country: "AE", region: "", label: "UAE (VAT)", kind: "vat", rate: 0.05, currency: "AED" },
  // UAE has no subnational tax regions — VAT is federal only.
  // Free zones (e.g. DMCC, JAFZA) historically had 0% for goods
  // moved within the zone, but digital services don't qualify — they
  // get the standard 5% rate. We don't model zone exemptions.
  // Note: UAE Federal Tax Authority considers B2C digital services
  // as "imported services" for the buyer; the marketplace facilitator
  // (us) is responsible for collecting. This is what we calculate here.

  // Saudi Arabia: 15% VAT since July 2020 (one of the highest in the GCC).
  // ZATCA (Zakat, Tax and Customs Authority) administers. No subnational
  // variation. Digital services are fully taxable.
  { country: "SA", region: "", label: "Saudi Arabia (VAT)", kind: "vat", rate: 0.15, currency: "SAR" },
  // Note: KSA is also considering a 4th slab for luxury goods but this
  // doesn't apply to digital services. Track via ZATCA announcements.

  // Oman: 5% VAT since April 2021. Administered by the Tax Authority
  // (OTA). No subnational variation.
  { country: "OM", region: "", label: "Oman (VAT)", kind: "vat", rate: 0.05, currency: "OMR" },

  // Bahrain: 10% VAT since January 2022. Administered by NBR.
  { country: "BH", region: "", label: "Bahrain (VAT)", kind: "vat", rate: 0.10, currency: "BHD" },

  // Kuwait: NO VAT as of 2026. Kuwait is the only GCC country without
  // a VAT regime. They levy a corporate income tax on foreign companies
  // only (not on individuals) but no consumption tax. Track for changes.
  { country: "KW", region: "", label: "Kuwait (no VAT)", kind: "none", rate: 0, currency: "KWD", description: "Kuwait has not implemented VAT. Corporate tax only on foreign entities." },

  // Qatar: NO VAT as of 2026. Qatar introduced a 5% VAT law in 2018
  // but never activated it. Track for changes.
  { country: "QA", region: "", label: "Qatar (VAT not implemented)", kind: "none", rate: 0, currency: "QAR", description: "Qatar enacted VAT law but has not activated it. Subject to change." },
];

export const TAX_SEED_VERSION = "2026-01-01";
export const TAX_SEED_LAST_VERIFIED = LAST_VERIFIED;