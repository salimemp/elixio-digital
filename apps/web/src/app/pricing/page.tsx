/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import Link from "next/link";
import { TranslationNotice } from "@/components/legal/TranslationNotice";

export const metadata: Metadata = {
  title: "Pricing — Elixio Digital",
  description:
    "No monthly fees. Creators keep 90% of every sale. Transparent pricing for buyers and creators.",
  alternates: { canonical: "https://elixiodigital.com/pricing" },
  openGraph: {
    title: "Pricing — Elixio Digital",
    description:
      "No monthly fees. Creators keep 90% of every sale. Transparent pricing.",
    url: "https://elixiodigital.com/pricing",
  },
};

/**
 * /pricing — public marketing page (server component, statically rendered).
 *
 * Highlights:
 *   - "No monthly fees" hero (the differentiation from Gumroad/iLovePDF)
 *   - 3-tier comparison: Buyer | Creator | Enterprise
 *   - Detailed fee breakdown
 *   - Payout schedule + methods
 *   - FAQ with 6 common questions
 *   - Comparison vs competitors (Gumroad, Etsy Digital)
 *
 * Localization: uses TranslationNotice component for non-English locales.
 * Source-of-truth content stays in English here — when a translation is
 * needed, the strings below move into i18n message files.
 */
export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="text-center">
        <h1 className="text-4xl font-extrabold ink-default sm:text-5xl">
          Pricing
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg ink-muted">
          No monthly fees. No listing fees. You only pay when you make a sale.
        </p>
        <TranslationNotice />
      </header>

      {/* Hero CTA */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/auth/register"
          className="rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          Start selling — free
        </Link>
        <Link
          href="/explore"
          className="rounded-lg border border-default bg-surface px-6 py-3 text-base font-medium ink-default transition-colors hover:bg-elevated"
        >
          Browse as buyer
        </Link>
      </div>

      {/* Fee breakdown hero */}
      <section className="mt-12 rounded-2xl border border-default bg-gradient-to-br from-gum-purple/10 via-surface to-surface p-8 dark:from-gum-purple/20">
        <div className="grid gap-6 md:grid-cols-3">
          <Stat label="Platform fee" value="10%" detail="Only on each sale" />
          <Stat label="Creator keeps" value="90%" detail="Of every sale price" />
          <Stat label="Monthly fees" value="$0" detail="No subscriptions, ever" />
        </div>
      </section>

      {/* Tier comparison */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold ink-default">For buyers, creators, and teams</h2>
        <p className="mt-2 ink-muted">
          Same 10% platform fee across all tiers. The differences are volume,
          support, and team features.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <TierCard
            name="Buyer"
            price="Free"
            priceNote="No fees to browse or buy"
            cta={{ label: "Browse marketplace", href: "/explore" }}
            features={[
              "Pay only the listed price + tax",
              "127 tax regions supported",
              "Local currency pricing in 42 languages",
              "Download history + receipts",
              "Aura AI assistant for support",
              "WCAG 2.1 AA accessibility",
            ]}
          />
          <TierCard
            name="Creator"
            price="10%"
            priceNote="Per sale, no monthly fee"
            cta={{ label: "Start selling", href: "/auth/register?type=creator" }}
            highlight
            features={[
              "Keep 90% of every sale",
              "No listing fees, no bandwidth fees",
              "Cloudflare R2 storage (zero egress)",
              "AI listing copywriter, image critique, sales coach",
              "Bulk operations, analytics, cohorts",
              "Branded storefront with custom domain",
              "Stripe Connect or Razorpay payouts",
            ]}
          />
          <TierCard
            name="Enterprise"
            price="Custom"
            priceNote="Volume + team features"
            cta={{ label: "Contact sales", href: "mailto:sales@elixiodigital.com" }}
            features={[
              "Volume discounts on the 10% fee",
              "Multi-seat team workspaces",
              "SSO (SAML, OIDC) + SCIM provisioning",
              "Custom DPA + SOC 2 report",
              "Dedicated success manager",
              "Priority engineering support",
              "Custom integrations + webhooks",
            ]}
          />
        </div>
      </section>

      {/* Detailed fee breakdown */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold ink-default">Where the 10% goes</h2>
        <p className="mt-2 ink-muted">
          We don't hide anything. Here's exactly what the platform fee covers:
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FeeItem label="Payment processing" detail="Stripe + Razorpay fees (typically 2.9% + 30¢)" share="~3%" />
          <FeeItem label="Cloud storage + CDN" detail="Cloudflare R2 zero-egress delivery to buyers worldwide" share="~2%" />
          <FeeItem label="Tax calculation + collection" detail="VAT, GST, sales tax across 127 regions" share="~2%" />
          <FeeItem label="Customer support" detail="24/7 multi-language help via Aura + email" share="~1%" />
          <FeeItem label="Platform development" detail="Engineering, security, AI features" share="~1%" />
          <FeeItem label="Profit margin" detail="Reinvested into growth, infrastructure, and creator tools" share="~1%" />
        </div>
      </section>

      {/* Payout schedule */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold ink-default">Payouts</h2>
        <div className="mt-6 overflow-hidden rounded-xl border border-default">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase ink-muted">
              <tr>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Minimum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default">
              <tr>
                <td className="px-4 py-3 font-medium ink-default">Global (135+ countries)</td>
                <td className="px-4 py-3">Stripe Connect</td>
                <td className="px-4 py-3">Weekly, every Tuesday</td>
                <td className="px-4 py-3">$10 USD</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium ink-default">India</td>
                <td className="px-4 py-3">Razorpay</td>
                <td className="px-4 py-3">Weekly, every Tuesday</td>
                <td className="px-4 py-3">₹500 INR</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium ink-default">EU (SEPA)</td>
                <td className="px-4 py-3">SEPA Direct Debit</td>
                <td className="px-4 py-3">Weekly, every Tuesday</td>
                <td className="px-4 py-3">€10 EUR</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm ink-muted">
          Payouts are made in your connected account's default currency. We
          don't auto-convert (you keep more by converting through your bank).
        </p>
      </section>

      {/* Comparison vs competitors */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold ink-default">How we compare</h2>
        <p className="mt-2 ink-muted">
          Same features as the big marketplaces, with significantly better
          economics for creators.
        </p>
        <div className="mt-6 overflow-x-auto rounded-xl border border-default">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase ink-muted">
              <tr>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3 text-gum-purple">Elixio</th>
                <th className="px-4 py-3">Gumroad</th>
                <th className="px-4 py-3">Etsy Digital</th>
                <th className="px-4 py-3">iLovePDF (Pro)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default">
              <Row label="Platform fee" elixio="10%" gumroad="10%" etsy="$0.20 + 6.5%" ilovepdf="—" />
              <Row label="Monthly fee" elixio="$0" gumroad="$0 (Free) / $10/mo (Pro)" etsy="$0" ilovepdf="$7.99/mo" />
              <Row label="Listing fee" elixio="$0" gumroad="$0" etsy="$0.20 per listing" ilovepdf="—" />
              <Row label="Bandwidth fees" elixio="None (R2 zero-egress)" gumroad="Included" etsy="Included" ilovepdf="Included" />
              <Row label="AI tools for creators" elixio="✓ Listing, critique, coach" gumroad="—" etsy="—" ilovepdf="—" />
              <Row label="Languages" elixio="42" gumroad="6" etsy="11" ilovepdf="15" />
              <Row label="Tax regions" elixio="127" gumroad="~50" etsy="~40" ilovepdf="EU + US" />
              <Row label="Accessibility" elixio="WCAG 2.1 AA + voice" gumroad="WCAG A (partial)" etsy="WCAG A (partial)" ilovepdf="WCAG A (partial)" />
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold ink-default">Frequently asked questions</h2>
        <div className="mt-6 space-y-4">
          <FAQ
            q="Are there any hidden fees?"
            a="No. The price you see is the price the buyer pays (plus applicable tax). The 10% platform fee is the only fee we charge, deducted from your payout. There are no monthly fees, listing fees, bandwidth fees, or surprise charges."
          />
          <FAQ
            q="When do I get paid?"
            a="Payouts run every Tuesday for all sales completed in the previous week (Mon–Sun). Minimum payout is $10 USD (or equivalent in your payout currency). You can also request an instant payout for a small fee via Stripe Connect or Razorpay."
          />
          <FAQ
            q="What happens if a buyer requests a refund?"
            a="If the buyer requests a refund within 7 days and the asset is defective or not as described, we issue a full refund and reverse the creator's payout for that sale. Disputes are reviewed by our support team — we side with the creator in clear cases of abuse."
          />
          <FAQ
            q="Can I sell free assets?"
            a="Yes. Free assets pay no platform fee. They're a great way to build a following and showcase your work."
          />
          <FAQ
            q="Do you support subscriptions or recurring billing?"
            a="Not yet. Subscriptions are on our Phase 2 roadmap (target: Q3 2026). For now, all sales are one-time."
          />
          <FAQ
            q="What payment methods do buyers get?"
            a="All major credit cards (Visa, Mastercard, AmEx, Discover, JCB), Apple Pay, Google Pay, and regional methods (UPI, iDEAL, SEPA, Boleto, PIX, Alipay, WeChat Pay) via Stripe and Razorpay."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mt-16 rounded-2xl bg-gradient-to-br from-gum-purple to-gum-purple-dark p-8 text-center text-white sm:p-12">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Ready to keep more of what you earn?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-white/90">
          Join the marketplace where creators keep 90% and buyers pay no
          hidden fees. Free to start, free to grow.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/auth/register?type=creator"
            className="rounded-lg bg-white px-6 py-3 font-medium text-gum-purple transition-colors hover:bg-white/90"
          >
            Start selling
          </Link>
          <Link
            href="/explore"
            className="rounded-lg border border-white/30 px-6 py-3 font-medium text-white transition-colors hover:bg-white/10"
          >
            Browse marketplace
          </Link>
        </div>
      </section>
    </div>
  );
}

// ── Page sub-components ──────────────────────────────────────────

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="text-center">
      <div className="text-sm uppercase tracking-wider ink-muted">{label}</div>
      <div className="mt-2 text-5xl font-extrabold ink-default">{value}</div>
      <div className="mt-1 text-sm ink-muted">{detail}</div>
    </div>
  );
}

interface TierProps {
  name: string;
  price: string;
  priceNote: string;
  cta: { label: string; href: string };
  features: string[];
  highlight?: boolean;
}

function TierCard({ name, price, priceNote, cta, features, highlight }: TierProps) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-6 ${
        highlight
          ? "border-gum-purple bg-gradient-to-b from-gum-purple/5 to-surface ring-2 ring-gum-purple"
          : "border-default bg-surface"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold ink-default">{name}</h3>
        {highlight && (
          <span className="rounded-full bg-gum-purple px-2 py-0.5 text-xs font-medium text-white">
            Most popular
          </span>
        )}
      </div>
      <div className="mt-4">
        <span className="text-4xl font-extrabold ink-default">{price}</span>
        <span className="ml-2 text-sm ink-muted">{priceNote}</span>
      </div>
      <Link
        href={cta.href}
        className={`mt-6 rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${
          highlight
            ? "bg-gum-purple text-white hover:bg-gum-purple-dark"
            : "border border-default bg-surface ink-default hover:bg-elevated"
        }`}
      >
        {cta.label}
      </Link>
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="select-none text-gum-purple">✓</span>
            <span className="ink-default">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeeItem({ label, detail, share }: { label: string; detail: string; share: string }) {
  return (
    <div className="rounded-lg border border-default bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <div className="font-medium ink-default">{label}</div>
        <div className="text-sm font-semibold text-gum-purple">{share}</div>
      </div>
      <p className="mt-1 text-sm ink-muted">{detail}</p>
    </div>
  );
}

interface RowProps {
  label: string;
  elixio: string;
  gumroad: string;
  etsy: string;
  ilovepdf: string;
}

function Row({ label, elixio, gumroad, etsy, ilovepdf }: RowProps) {
  return (
    <tr>
      <td className="px-4 py-3 font-medium ink-default">{label}</td>
      <td className="px-4 py-3 font-semibold text-gum-purple">{elixio}</td>
      <td className="px-4 py-3 ink-muted">{gumroad}</td>
      <td className="px-4 py-3 ink-muted">{etsy}</td>
      <td className="px-4 py-3 ink-muted">{ilovepdf}</td>
    </tr>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-lg border border-default bg-surface p-4">
      <summary className="cursor-pointer font-medium ink-default marker:hidden">
        {q}
      </summary>
      <p className="mt-3 text-sm ink-muted">{a}</p>
    </details>
  );
}