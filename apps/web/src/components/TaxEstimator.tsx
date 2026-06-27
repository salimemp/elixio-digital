"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { calculateTax, type TaxResult } from "@/lib/tax";

/**
 * Inline tax estimator for an asset. Buyer picks their country +
 * state/region, sees the tax that would be added at checkout. Pure
 * client-side — calls /tax/calculate. Doesn't submit anything; just
 * previews.
 */
export function TaxEstimator({
  priceCents,
  currency,
}: {
  priceCents: number;
  currency: string;
}) {
  const { t, formatPrice } = useI18n();
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [result, setResult] = useState<TaxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common country list — focused on the 8 supported regions
  const COUNTRIES = [
    { code: "US", label: "United States" },
    { code: "CA", label: "Canada" },
    { code: "GB", label: "United Kingdom" },
    { code: "IE", label: "Ireland" },
    { code: "DE", label: "Germany" },
    { code: "FR", label: "France" },
    { code: "ES", label: "Spain" },
    { code: "IT", label: "Italy" },
    { code: "NL", label: "Netherlands" },
    { code: "PL", label: "Poland" },
    { code: "SE", label: "Sweden" },
    { code: "AT", label: "Austria" },
    { code: "BE", label: "Belgium" },
    { code: "DK", label: "Denmark" },
    { code: "FI", label: "Finland" },
    { code: "PT", label: "Portugal" },
    { code: "IN", label: "India" },
    { code: "AU", label: "Australia" },
    { code: "JP", label: "Japan" },
    { code: "BR", label: "Brazil" },
    { code: "SG", label: "Singapore" },
    { code: "CH", label: "Switzerland" },
    { code: "NO", label: "Norway" },
    { code: "AE", label: "UAE" },
    { code: "HK", label: "Hong Kong" },
  ];

  // Subset that needs a state/region picker
  const NEEDS_REGION = new Set(["US", "CA", "BR"]);

  useEffect(() => {
    if (!country) {
      setResult(null);
      return;
    }
    const input = NEEDS_REGION.has(country) && !region ? null : { country, region };
    if (!input) {
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    calculateTax(priceCents, input)
      .then(setResult)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
    // NEEDS_REGION is a module-level constant; safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, region, priceCents]);

  return (
    <div className="gum-card">
      <h3 className="mb-2 text-base font-bold">{t("checkout.title")} — {t("checkout.tax")}</h3>
      <p className="mb-3 text-xs ink-muted">
        Preview tax on {formatPrice(priceCents, currency)}. Final amount calculated at checkout.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setRegion("");
            setResult(null);
          }}
          className="rounded-xl border-2 border-gum-black bg-white px-3 py-2 text-sm"
        >
          <option value="">{t("checkout.country")}…</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        {NEEDS_REGION.has(country) && (
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value.toUpperCase())}
            placeholder={country === "US" ? "CA, NY, TX…" : country === "CA" ? "ON, QC, BC…" : "SP, RJ, MG…"}
            className="rounded-xl border-2 border-gum-black bg-white px-3 py-2 text-sm uppercase placeholder:normal-case"
          />
        )}
      </div>

      <div className="mt-3 min-h-[40px]">
        {!country && (
          <p className="text-sm ink-subtle">Pick a country to estimate tax.</p>
        )}
        {country && NEEDS_REGION.has(country) && !region && (
          <p className="text-sm ink-subtle">Enter your state/province.</p>
        )}
        {loading && <p className="text-sm ink-subtle">{t("checkout.calculating_tax")}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && result.lines.length === 0 && result.rateFound === false && (
          <div className="rounded-xl border-2 border-yellow-500 bg-yellow-50 p-2 text-xs">
            <p className="font-bold">No tax configured for {result.resolvedCountry}{result.resolvedRegion ? ` / ${result.resolvedRegion}` : ""}.</p>
            <p className="text-yellow-800">You&apos;ll be charged 0% tax.</p>
          </div>
        )}
        {result && result.lines.length > 0 && (
          <div className="space-y-1 text-sm">
            {result.lines.map((line, i) => (
              <div key={i} className="flex items-center justify-between">
                <span>
                  {line.label}{" "}
                  <span className="ink-subtle">({(line.rate * 100).toFixed(2)}%)</span>
                </span>
                <span className="font-bold">{formatPrice(line.amountCents, result.currency)}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t pt-2 font-extrabold">
              <span>{t("checkout.tax")}</span>
              <span className="text-gum-purple">{formatPrice(result.totalTaxCents, result.currency)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}