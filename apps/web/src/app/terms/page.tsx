/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Elixio Digital",
  description: "The agreement between you and Elixio Digital when using our marketplace.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-4xl font-extrabold ink-default">Terms of Service</h1>
      <p className="mb-8 text-sm ink-muted">
        Last updated: 28 June 2026 · Effective immediately
      </p>

      <Section title="1. Acceptance">
        <p>
          By creating an account, uploading content, or making a purchase on Elixio
          Digital (the "Service"), you agree to these Terms of Service ("Terms"). If
          you do not agree, do not use the Service.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must be at least 16 years old (18 in some jurisdictions) to use the
          Service. By using the Service, you represent that you meet this
          requirement. Creators who sell on the Service must also be legally able to
          enter into binding contracts in their jurisdiction.
        </p>
      </Section>

      <Section title="3. Accounts">
        <p>You are responsible for:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Keeping your password and authentication factors secure.</li>
          <li>
            All activity that happens under your account. Enable two-factor
            authentication (TOTP or passkey) to protect yourself.
          </li>
          <li>Providing accurate registration information (email, display name).</li>
          <li>
            Notifying us immediately at{" "}
            <a href="mailto:security@elixiodigital.com" className="font-semibold text-gum-purple underline">
              security@elixiodigital.com
            </a>{" "}
            if you suspect unauthorized access.
          </li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these Terms or that we
          reasonably believe pose a security risk.
        </p>
      </Section>

      <Section title="4. Buyer terms">
        <p>When you buy a digital asset on Elixio Digital:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            You receive a non-exclusive, non-transferable license to use the asset as
            described in the license granted by the Creator at the time of purchase.
            Standard licenses cover personal and commercial use, with no
            redistribution or resale. See each asset's license terms before purchase.
          </li>
          <li>
            All sales are <strong>final</strong>, except where required by law
            (e.g. EU consumer rights for digital content). We do not offer refunds on
            digital downloads once the file has been accessed, except for material
            misrepresentation by the Creator.
          </li>
          <li>
            Prices are displayed in your local currency (where available) and include
            applicable taxes calculated at checkout based on your billing address.
          </li>
          <li>
            You agree not to redistribute, resell, or share the asset outside the
            terms of the license. Doing so may result in license revocation.
          </li>
        </ul>
      </Section>

      <Section title="5. Creator terms">
        <p>When you sell a digital asset on Elixio Digital:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            You retain full ownership of your content. We receive a limited license
            to host, display, and distribute it on the Service.
          </li>
          <li>
            You must own or have the right to distribute every file you upload. Do
            not upload assets containing third-party copyrighted material (music,
            stock photos, code) unless you have a license or it's in the public domain.
          </li>
          <li>
            You are responsible for the accuracy of your asset descriptions, pricing,
            and license terms. Misleading descriptions are grounds for removal.
          </li>
          <li>
            We charge a platform fee on each sale (currently 8% + payment processing).
            The remainder is paid out to you via Stripe Connect (when available).
          </li>
          <li>
            You agree to deliver the file the buyer paid for. Failure to deliver may
            result in forced refunds and account review.
          </li>
          <li>
            You must comply with applicable tax laws in your jurisdiction. We provide
            tax calculation for buyers but recommend consulting a tax professional
            for your own obligations.
          </li>
        </ul>
      </Section>

      <Section title="6. Prohibited content">
        <p>You may not upload, sell, or distribute content that:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Infringes third-party intellectual property rights.</li>
          <li>Contains malware, viruses, or other harmful code.</li>
          <li>Is illegal in any jurisdiction where it will be distributed.</li>
          <li>
            Depicts non-consensual intimate imagery, child sexual abuse material
            (CSAM), or content that sexualizes minors in any way.
          </li>
          <li>Promotes violence, terrorism, or hate speech against protected groups.</li>
          <li>Is deceptive, fraudulent, or designed to scam buyers.</li>
        </ul>
        <p>
          We use a combination of automated scanning, user reports, and manual review
          to enforce these rules. Accounts that violate may be terminated without
          notice.
        </p>
      </Section>

      <Section title="7. Platform fees and payments">
        <p>
          We charge a platform fee on each sale, deducted from the gross sale price
          before payout to the Creator. Current fees:
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Platform fee</strong> — 8% of the sale price (covers hosting,
            moderation, payment processing overhead, customer support).
          </li>
          <li>
            <strong>Payment processing</strong> — Stripe / Razorpay charge their own
            fees (typically 2.9% + 30¢ for Stripe, ~2% for Razorpay).
          </li>
          <li>
            <strong>Payouts</strong> — weekly, via Stripe Connect Express (Creators
            in supported countries) or Razorpay Route (India). Minimum payout
            threshold: $10.
          </li>
        </ul>
        <p>
          Fee structure may change with 30 days' notice via email. Material changes
          apply to new sales only, not retroactive.
        </p>
      </Section>

      <Section title="8. Intellectual property">
        <p>
          The Service itself (code, design, branding, "Elixio Digital" name and logo)
          is owned by us. You may not copy, modify, or distribute it without written
          permission. Creators retain ownership of their uploaded content; we have a
          limited license to host and distribute it on the Service.
        </p>
      </Section>

      <Section title="9. Disclaimers and liability">
        <p>
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE
          MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL IMPLIED WARRANTIES,
          INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT.
        </p>
        <p>We are not liable for:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Content uploaded by Creators (they, not us, are responsible).</li>
          <li>Loss of data, profits, or business arising from Service interruptions.</li>
          <li>Unauthorized access caused by your failure to secure your account.</li>
        </ul>
        <p>
          Our total liability to you for any claim arising from the Service is
          capped at the greater of (a) the fees you paid us in the 12 months
          preceding the claim, or (b) $100 USD. Some jurisdictions do not allow
          liability limits; in those cases the limit applies to the maximum extent
          permitted.
        </p>
      </Section>

      <Section title="10. Indemnification">
        <p>
          You agree to indemnify and hold us harmless from any third-party claim
          arising from (a) your breach of these Terms, (b) your content, or (c) your
          misuse of the Service.
        </p>
      </Section>

      <Section title="11. Termination">
        <p>
          You may close your account at any time from your account settings. We may
          suspend or terminate your account if you violate these Terms, with or
          without notice depending on severity. Upon termination, your right to use
          the Service ends. Provisions that should survive (intellectual property,
          disclaimers, indemnification) survive termination.
        </p>
      </Section>

      <Section title="12. Disputes and governing law">
        <p>
          These Terms are governed by the laws of India (where Elixio Digital is
          incorporated). Any dispute will be resolved in the courts of Bangalore,
          Karnataka, India. If you are a consumer in the EEA, UK, or another
          jurisdiction with mandatory consumer protection laws, you retain the
          right to bring claims in your local courts under your local law.
        </p>
        <p>
          We will attempt to resolve disputes informally first — email{" "}
          <a href="mailto:legal@elixiodigital.com" className="font-semibold text-gum-purple underline">
            legal@elixiodigital.com
          </a>{" "}
          to start.
        </p>
      </Section>

      <Section title="13. Changes to these Terms">
        <p>
          We may update these Terms. Material changes will be announced via email at
          least 30 days before they take effect. Continued use after the effective
          date constitutes acceptance.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          For any question about these Terms, write to{" "}
          <a href="mailto:legal@elixiodigital.com" className="font-semibold text-gum-purple underline">
            legal@elixiodigital.com
          </a>
          .
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 rounded-2xl border-2 border-gum-black bg-gum-cream p-6 shadow-[0_6px_0_0_#111]">
      <h2 className="mb-3 text-2xl font-extrabold ink-default">{title}</h2>
      <div className="space-y-3 ink-default">{children}</div>
    </section>
  );
}