/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Elixio Digital",
  description: "How Elixio Digital collects, uses, and protects your personal data.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-4xl font-extrabold ink-default">Privacy Policy</h1>
      <p className="mb-8 text-sm ink-muted">
        Last updated: 28 June 2026 · Effective immediately
      </p>

      <Section title="1. Who we are">
        <p>
          Elixio Digital ("we", "us", "our") operates the marketplace at{" "}
          <strong>elixiodigital.com</strong>. We are the data controller for any
          personal information you provide when using our Service. You can reach our
          Data Protection Officer at{" "}
          <a href="mailto:privacy@elixiodigital.com" className="font-semibold text-gum-purple underline">
            privacy@elixiodigital.com
          </a>
          .
        </p>
      </Section>

      <Section title="2. What data we collect">
        <p>We collect the following categories of personal data:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Account data</strong> — email, display name, hashed password
            (bcrypt, cost factor 12). OAuth profile data if you sign in with Google
            or GitHub.
          </li>
          <li>
            <strong>Authentication metadata</strong> — IP address, user agent,
            approximate geo-location (country/city via ipapi.co, 7-day cache), login
            timestamps, MFA factors (TOTP seeds encrypted with AES-256-GCM, WebAuthn
            passkey public keys).
          </li>
          <li>
            <strong>Creator content</strong> — uploaded asset files, preview images,
            storefront metadata, sales analytics aggregated from your activity.
          </li>
          <li>
            <strong>Buyer activity</strong> — purchases, download history, tax-region
            snapshots attached to each Order.
          </li>
          <li>
            <strong>Usage data</strong> — pages viewed, features used, error logs.
            We do <em>not</em> sell your data to third parties.
          </li>
        </ul>
      </Section>

      <Section title="3. How we use your data">
        <p>We use your personal data for the following purposes:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Creating and authenticating your account.</li>
          <li>Processing payments and issuing invoices/receipts.</li>
          <li>Calculating and collecting applicable taxes (VAT, GST, sales tax).</li>
          <li>Sending transactional emails (verification, password reset, purchase receipts).</li>
          <li>
            Sending security alerts when we detect a sign-in from a new country or
            device.
          </li>
          <li>Improving the Service through aggregated analytics.</li>
          <li>Complying with legal obligations (tax reporting, anti-fraud).</li>
        </ul>
        <p>
          We rely on the following legal bases under GDPR Article 6: (a) performance
          of contract (your purchase), (b) our legitimate interests (security, fraud
          prevention), (c) legal obligation (tax, anti-money-laundering), and (d)
          your consent (marketing communications, non-essential cookies).
        </p>
      </Section>

      <Section title="4. Cookies and similar technologies">
        <p>We use a minimal set of cookies and localStorage entries:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Authentication</strong> — access token + refresh token in{" "}
            <code className="rounded bg-gum-cream px-1.5 py-0.5 text-sm">localStorage</code>.
            Essential to the Service and cannot be disabled.
          </li>
          <li>
            <strong>Locale preference</strong> — your chosen language + RTL flag in{" "}
            <code className="rounded bg-gum-cream px-1.5 py-0.5 text-sm">localStorage</code>.
            Essential for i18n; cannot be disabled.
          </li>
          <li>
            <strong>Theme preference</strong> — light/dark/system mode + brand
            palette in{" "}
            <code className="rounded bg-gum-cream px-1.5 py-0.5 text-sm">localStorage</code>.
            Functional but non-essential.
          </li>
          <li>
            <strong>Cookie consent</strong> — your Accept/Decline choice in{" "}
            <code className="rounded bg-gum-cream px-1.5 py-0.5 text-sm">localStorage</code>.
            Stored for 12 months as required by GDPR / ePrivacy.
          </li>
        </ul>
        <p>
          We do <em>not</em> use third-party advertising cookies. See our{" "}
          <a href="/cookies" className="font-semibold text-gum-purple underline">
            Cookie Policy
          </a>{" "}
          for full details.
        </p>
      </Section>

      <Section title="5. Who we share data with">
        <p>We share personal data with a small set of vetted processors:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li><strong>Cloudflare</strong> — DNS, CDN, DDoS protection.</li>
          <li><strong>Railway</strong> — application hosting (US region).</li>
          <li><strong>Cloudflare R2</strong> — encrypted file storage (zero-egress).</li>
          <li><strong>Resend</strong> — transactional email delivery.</li>
          <li>
            <strong>Google Gemini API</strong> — AI features (listing copywriter,
            asset critique, sales coach). Only the content you submit is sent; no
            account data.
          </li>
          <li><strong>Stripe / Razorpay</strong> — payment processing (when payments ship).</li>
          <li><strong>ipapi.co</strong> — IP-to-location lookup (7-day cache).</li>
        </ul>
        <p>
          Each processor has a Data Processing Agreement (DPA) on file. We do not
          sell your personal data, and we do not share it with advertisers.
        </p>
      </Section>

      <Section title="6. International transfers">
        <p>
          Our primary database is hosted in the US (Railway). If you are in the EEA,
          UK, or Switzerland, your data is transferred to the US under the European
          Commission's Standard Contractual Clauses (SCCs) plus supplementary
          measures (encryption at rest and in transit, access logging). Contact us
          for a copy of our Transfer Impact Assessment (TIA).
        </p>
      </Section>

      <Section title="7. Data retention">
        <p>We keep your personal data only as long as needed:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Account data: while your account is active + 30 days after deletion request.</li>
          <li>Authentication logs: 90 days, then aggregated.</li>
          <li>Tax records (orders, invoices): 7 years (required by tax law).</li>
          <li>Backups: encrypted, retained for 35 days then deleted.</li>
        </ul>
      </Section>

      <Section title="8. Your rights">
        <p>Depending on your jurisdiction, you have some or all of these rights:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li><strong>Access</strong> — request a copy of your personal data.</li>
          <li><strong>Rectification</strong> — correct inaccurate data.</li>
          <li><strong>Erasure</strong> — request deletion (&ldquo;right to be forgotten&rdquo;).</li>
          <li><strong>Restriction</strong> — pause processing while a dispute is resolved.</li>
          <li>
            <strong>Portability</strong> — receive your data in a machine-readable
            format (JSON).
          </li>
          <li><strong>Object</strong> — opt out of processing based on legitimate interest.</li>
          <li><strong>Withdraw consent</strong> — for marketing or non-essential cookies.</li>
          <li><strong>Lodge a complaint</strong> with your local data protection authority.</li>
        </ul>
        <p>
          To exercise any of these rights, email{" "}
          <a href="mailto:privacy@elixiodigital.com" className="font-semibold text-gum-purple underline">
            privacy@elixiodigital.com
          </a>{" "}
          from your registered account email. We respond within 30 days.
        </p>
      </Section>

      <Section title="9. Security">
        <p>We protect your data with industry-standard measures:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>TLS 1.3 in transit, AES-256 at rest.</li>
          <li>Passwords hashed with bcrypt cost 12.</li>
          <li>TOTP seeds and OAuth tokens encrypted with AES-256-GCM (key managed separately).</li>
          <li>HSTS preload, strict CSP, X-Frame-Options: DENY.</li>
          <li>Rate limits per action + global IP limits.</li>
          <li>New-location sign-in email alerts.</li>
          <li>Regular access-log review + automated anomaly detection.</li>
        </ul>
      </Section>

      <Section title="10. Children">
        <p>
          The Service is not directed at children under 16. We do not knowingly
          collect data from children. If you believe a child has provided data,
          contact us and we will delete it within 7 days.
        </p>
      </Section>

      <Section title="11. Changes to this policy">
        <p>
          We may update this Privacy Policy. Material changes will be announced via
          email at least 30 days before they take effect. The "Last updated" date at
          the top reflects the current version.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          For any privacy-related question, write to{" "}
          <a href="mailto:privacy@elixiodigital.com" className="font-semibold text-gum-purple underline">
            privacy@elixiodigital.com
          </a>
          . We aim to respond within 5 business days.
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