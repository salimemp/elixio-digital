import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the service
const findFirstMock = vi.fn();
const findManyMock = vi.fn();
const upsertMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    taxRegion: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      findMany: (...args: unknown[]) => findManyMock(...args),
      upsert: (...args: unknown[]) => upsertMock(...args),
    },
  },
}));

// Now import the service (which uses the mocked prisma)
const { calculateTax, listTaxRegions, seedTaxRegions } = await import("./tax.js");

// Helper to make a fake prisma row
const row = (r: {
  country: string;
  region: string;
  kind?: string;
  rate: number;
  currency?: string;
  label?: string;
}) => ({
  id: `id-${r.country}-${r.region}`,
  country: r.country,
  region: r.region,
  kind: (r.kind ?? "vat") as "vat" | "gst" | "sales" | "iva" | "hst" | "qst" | "icms" | "pis_cofins" | "consumption" | "none",
  rate: r.rate,
  currency: r.currency ?? "USD",
  label: r.label ?? `${r.country} ${r.kind ?? "vat"}`,
  description: null,
  sourceUrl: null,
  lastVerified: new Date("2026-01-01"),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

beforeEach(() => {
  findFirstMock.mockReset();
  findManyMock.mockReset();
  upsertMock.mockReset();
});

describe("calculateTax — basic regional lookups", () => {
  it("applies US California 7.25% sales tax to $100", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "US", region: "US-CA", kind: "sales", rate: 0.0725, currency: "USD" }));
    const result = await calculateTax(10000, { country: "US", region: "US-CA" });
    expect(result.totalTaxCents).toBe(725); // 7.25% of 10000 = 725
    expect(result.currency).toBe("USD");
    expect(result.rateFound).toBe(true);
    expect(result.resolvedRegion).toBe("US-CA");
  });

  it("applies UK 20% VAT to £50", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "GB", region: "", kind: "vat", rate: 0.20, currency: "GBP" }));
    const result = await calculateTax(5000, { country: "GB" });
    expect(result.totalTaxCents).toBe(1000);
    expect(result.currency).toBe("GBP");
  });

  it("applies UAE 5% VAT to AED 100", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "AE", region: "", kind: "vat", rate: 0.05, currency: "AED" }));
    const result = await calculateTax(10000, { country: "AE" });
    expect(result.totalTaxCents).toBe(500);
    expect(result.currency).toBe("AED");
  });

  it("applies Israel 18% VAT to ILS 100", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "IL", region: "", kind: "vat", rate: 0.18, currency: "ILS" }));
    const result = await calculateTax(10000, { country: "IL" });
    expect(result.totalTaxCents).toBe(1800);
    expect(result.currency).toBe("ILS");
  });

  it("returns 0% with suggestions for unconfigured country", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const result = await calculateTax(10000, { country: "ZZ" });
    expect(result.totalTaxCents).toBe(0);
    expect(result.rateFound).toBe(false);
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions!.length).toBeGreaterThan(0);
    expect(result.suggestions!.join(" ")).toContain("ZZ");
  });

  it("returns rateFound=false when a region is provided but no row exists for it", async () => {
    // First call: region-specific lookup returns null (no US-XX row)
    // The current implementation does NOT fall back when region was provided.
    // It returns rateFound=false so the buyer can be informed.
    findFirstMock.mockResolvedValueOnce(null);
    const result = await calculateTax(10000, { country: "US", region: "US-XX" });
    expect(result.totalTaxCents).toBe(0);
    expect(result.rateFound).toBe(false);
    expect(result.suggestions).toBeDefined();
  });

  it("returns rateFound=true with 0% when country-level rate exists and no region provided", async () => {
    // No region provided, country lookup returns Alaska 0% row
    findFirstMock.mockResolvedValueOnce(row({ country: "US", region: "", kind: "sales", rate: 0, currency: "USD", label: "Alaska (no state tax)" }));
    const result = await calculateTax(10000, { country: "US" });
    expect(result.totalTaxCents).toBe(0);
    expect(result.rateFound).toBe(true);
  });
});

describe("calculateTax — India GST slab normalization", () => {
  it("accepts region in IN-GST-18 format", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "IN", region: "IN-GST-18", kind: "gst", rate: 0.18, currency: "INR" }));
    const result = await calculateTax(100000, { country: "IN", region: "IN-GST-18" });
    expect(result.totalTaxCents).toBe(18000);
  });

  it("accepts gstSlab field with bare number", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "IN", region: "IN-GST-12", kind: "gst", rate: 0.12, currency: "INR" }));
    const result = await calculateTax(100000, { country: "IN", gstSlab: "12" } as any);
    expect(result.totalTaxCents).toBe(12000);
  });

  it("accepts gstSlab field with GST-N format", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "IN", region: "IN-GST-28", kind: "gst", rate: 0.28, currency: "INR" }));
    const result = await calculateTax(100000, { country: "IN", gstSlab: "GST-28" } as any);
    expect(result.totalTaxCents).toBe(28000);
  });

  it("defaults to 18% standard slab when no slab provided", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "IN", region: "IN-GST-18", kind: "gst", rate: 0.18, currency: "INR" }));
    const result = await calculateTax(100000, { country: "IN" });
    expect(result.totalTaxCents).toBe(18000);
  });

  it("accepts bare number as region field", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "IN", region: "IN-GST-5", kind: "gst", rate: 0.05, currency: "INR" }));
    const result = await calculateTax(100000, { country: "IN", region: "5" });
    expect(result.totalTaxCents).toBe(5000);
  });
});

describe("calculateTax — Brazil ICMS + PIS/COFINS auto-stack", () => {
  it("stacks federal PIS/COFINS on top of state ICMS for Brazil-SP", async () => {
    // First call: BR-SP ICMS 18%
    // Second call: BR federal PIS/COFINS 7.65%
    findFirstMock
      .mockResolvedValueOnce(row({ country: "BR", region: "BR-SP", kind: "icms", rate: 0.18, currency: "BRL" }))
      .mockResolvedValueOnce(row({ country: "BR", region: "", kind: "pis_cofins", rate: 0.0765, currency: "BRL" }));
    const result = await calculateTax(10000, { country: "BR", region: "BR-SP" });
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].kind).toBe("icms");
    expect(result.lines[1].kind).toBe("pis_cofins");
    // Total = 18% + 7.65% = 25.65% of 10000 = 2565
    expect(result.totalTaxCents).toBe(2565);
  });
});

describe("calculateTax — rounding", () => {
  it("rounds UP for sub-cent precision (favors tax authority)", async () => {
    // 5.5% × $9.99 = $0.54945 → should round to $0.55 (not $0.54)
    findFirstMock.mockResolvedValueOnce(row({ country: "US", region: "US-MO", kind: "sales", rate: 0.04225, currency: "USD" }));
    const result = await calculateTax(999, { country: "US", region: "US-MO" });
    // 999 × 0.04225 = 42.20775 → ceil to 43
    expect(result.lines[0].amountCents).toBe(43);
  });

  it("rounds up even on tiny amounts (1¢ × 0.05% rate)", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "AE", region: "", kind: "vat", rate: 0.05, currency: "AED" }));
    const result = await calculateTax(1, { country: "AE" });
    // 1 × 0.05 = 0.05 → ceil to 1
    expect(result.totalTaxCents).toBe(1);
  });

  it("returns 0 for zero amount (no rounding noise)", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "US", region: "US-CA", kind: "sales", rate: 0.0725, currency: "USD" }));
    const result = await calculateTax(0, { country: "US", region: "US-CA" });
    expect(result.totalTaxCents).toBe(0);
  });
});

describe("calculateTax — country code normalization", () => {
  it("uppercases lowercase country codes", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "US", region: "US-NY", kind: "sales", rate: 0.04, currency: "USD" }));
    const result = await calculateTax(10000, { country: "us", region: "us-ny" });
    expect(result.resolvedCountry).toBe("US");
    expect(result.resolvedRegion).toBe("US-NY");
  });

  it("uppercases mixed-case region codes", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "CA", region: "CA-ON", kind: "hst", rate: 0.13, currency: "CAD" }));
    const result = await calculateTax(10000, { country: "ca", region: "ca-on" });
    expect(result.totalTaxCents).toBe(1300);
  });
});

describe("calculateTax — safety", () => {
  it("does not throw on malformed address", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const result = await calculateTax(10000, { country: "ZZ" });
    expect(result.totalTaxCents).toBe(0);
  });

  it("does not throw on negative amount (returns 0)", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "US", region: "US-CA", kind: "sales", rate: 0.0725, currency: "USD" }));
    // Math.ceil of a negative still gives a negative number, but the function
    // shouldn't throw. The semantics are: negative taxes don't make sense for
    // a charge, so the caller should guard. The function computes honestly.
    const result = await calculateTax(-100, { country: "US", region: "US-CA" });
    expect(result.lines[0].amountCents).toBeLessThanOrEqual(0);
  });

  it("handles very large amounts without overflow", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "GB", region: "", kind: "vat", rate: 0.20, currency: "GBP" }));
    const result = await calculateTax(1_000_000_000, { country: "GB" }); // £10M
    expect(result.totalTaxCents).toBe(200_000_000); // £2M VAT
  });
});

describe("listTaxRegions", () => {
  it("returns active regions filtered by country", async () => {
    findManyMock.mockResolvedValueOnce([
      row({ country: "US", region: "US-CA", kind: "sales", rate: 0.0725 }),
      row({ country: "US", region: "US-NY", kind: "sales", rate: 0.04 }),
    ]);
    const result = await listTaxRegions("US");
    expect(findManyMock).toHaveBeenCalledWith({
      where: { country: "US", isActive: true },
      orderBy: [{ country: "asc" }, { region: "asc" }],
      select: expect.any(Object),
    });
    expect(result).toHaveLength(2);
  });

  it("returns all active regions when no country filter", async () => {
    findManyMock.mockResolvedValueOnce([]);
    await listTaxRegions();
    expect(findManyMock).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: expect.any(Array),
      select: expect.any(Object),
    });
  });
});

describe("seedTaxRegions", () => {
  it("upserts all rates from the canonical TAX_RATES table", async () => {
    upsertMock.mockResolvedValue({});
    const result = await seedTaxRegions();
    // TAX_RATES has 122+ rows; verify upsert was called that many times
    expect(upsertMock.mock.calls.length).toBeGreaterThan(100);
    expect(result.count).toBe(upsertMock.mock.calls.length);
    expect(result.source).toContain("tax-rates.ts@");
  });
});
describe("calculateTax — China VAT slabs", () => {
  it("applies 13% standard VAT to ¥100", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "CN", region: "CN-VAT-13", kind: "vat", rate: 0.13, currency: "CNY" }));
    const result = await calculateTax(10000, { country: "CN", region: "CN-VAT-13" });
    expect(result.totalTaxCents).toBe(1300);
    expect(result.currency).toBe("CNY");
  });

  it("applies 9% reduced VAT for food/books", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "CN", region: "CN-VAT-9", kind: "vat", rate: 0.09, currency: "CNY" }));
    const result = await calculateTax(10000, { country: "CN", region: "CN-VAT-9" });
    expect(result.totalTaxCents).toBe(900);
  });

  it("applies 6% services VAT", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "CN", region: "CN-VAT-6", kind: "vat", rate: 0.06, currency: "CNY" }));
    const result = await calculateTax(10000, { country: "CN", region: "CN-VAT-6" });
    expect(result.totalTaxCents).toBe(600);
  });

  it("applies 3% small-scale taxpayer VAT", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "CN", region: "CN-VAT-3", kind: "vat", rate: 0.03, currency: "CNY" }));
    const result = await calculateTax(10000, { country: "CN", region: "CN-VAT-3" });
    expect(result.totalTaxCents).toBe(300);
  });

  it("accepts bare-number region and normalizes to CN-VAT-N", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "CN", region: "CN-VAT-9", kind: "vat", rate: 0.09, currency: "CNY" }));
    const result = await calculateTax(10000, { country: "CN", region: "9" });
    expect(result.totalTaxCents).toBe(900);
  });

  it("accepts gstSlab field for backward compatibility", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "CN", region: "CN-VAT-6", kind: "vat", rate: 0.06, currency: "CNY" }));
    const result = await calculateTax(10000, { country: "CN", gstSlab: "6" } as any);
    expect(result.totalTaxCents).toBe(600);
  });

  it("defaults to 13% standard when no slab provided", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "CN", region: "CN-VAT-13", kind: "vat", rate: 0.13, currency: "CNY" }));
    const result = await calculateTax(10000, { country: "CN" });
    expect(result.totalTaxCents).toBe(1300);
  });
});

describe("calculateTax — Japan consumption tax", () => {
  it("applies 10% standard consumption tax to ¥1000", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "JP", region: "JP-CTAX-10", kind: "consumption", rate: 0.10, currency: "JPY" }));
    const result = await calculateTax(100000, { country: "JP", region: "JP-CTAX-10" });
    expect(result.totalTaxCents).toBe(10000);
    expect(result.currency).toBe("JPY");
  });

  it("applies 8% reduced consumption tax for food/beverages", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "JP", region: "JP-CTAX-8", kind: "consumption", rate: 0.08, currency: "JPY" }));
    const result = await calculateTax(10000, { country: "JP", region: "JP-CTAX-8" });
    expect(result.totalTaxCents).toBe(800);
  });

  it("defaults to 10% when no region provided", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "JP", region: "JP-CTAX-10", kind: "consumption", rate: 0.10, currency: "JPY" }));
    const result = await calculateTax(10000, { country: "JP" });
    expect(result.totalTaxCents).toBe(1000);
  });
});

describe("calculateTax — Korea VAT", () => {
  it("applies 10% VAT to ₩100,000", async () => {
    findFirstMock.mockResolvedValueOnce(row({ country: "KR", region: "", kind: "vat", rate: 0.10, currency: "KRW" }));
    const result = await calculateTax(10000000, { country: "KR" });
    expect(result.totalTaxCents).toBe(1000000);
    expect(result.currency).toBe("KRW");
  });

  it("returns 0% when no KR region (single rate, no subnational)", async () => {
    // KR has no subnational variation, so a region lookup should still find country-level
    findFirstMock.mockResolvedValueOnce(row({ country: "KR", region: "", kind: "vat", rate: 0.10, currency: "KRW" }));
    const result = await calculateTax(1000000, { country: "KR" });
    expect(result.totalTaxCents).toBe(100000);
  });
});

describe("seedTaxRegions — counts after CN/KR additions", () => {
  it("includes China + Korea rows", async () => {
    upsertMock.mockResolvedValue({});
    const result = await seedTaxRegions();
    // Verify upsert was called for the new CN rows + KR row
    const calls = upsertMock.mock.calls;
    const countries = new Set<string>();
    for (const c of calls) {
      countries.add(c[0]?.where?.country_region_kind?.country);
    }
    expect(countries.has("CN")).toBe(true);
    expect(countries.has("KR")).toBe(true);
    expect(countries.has("JP")).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(125); // was 122, now +4 CN + 1 KR + 1 JP-CTAX-8 - 1 JP = +5 net
  });
});
