/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — Elixio Digital",
  description: "What cookies and similar technologies Elixio Digital uses, and why.",
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-4xl font-extrabold ink-default">Cookie Policy</h1>
      <p className="mb-8 text-sm ink-muted">Last updated: 28 June 2026</p>

      <Section title="What is a cookie?">
        <p>
          A cookie is a small text file that a website stores on your device. We use
          the term &ldquo;cookie&rdquo; to cover cookies, localStorage entries, and similar
          technologies that store data on your device.
        </p>
      </Section>

      <Section title="Cookies we use">
        <p>We use the minimum set needed to operate the Service:</p>

        <table className="my-4 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gum-black">
              <th className="py-2 text-left font-extrabold ink-default">Name</th>
              <th className="py-2 text-left font-extrabold ink-default">Purpose</th>
              <th className="py-2 text-left font-extrabold ink-default">Type</th>
              <th className="py-2 text-left font-extrabold ink-default">Duration</th>
            </tr>
          </thead>
          <tbody className="ink-default">
            <tr className="border-b border-gum-black/20">
              <td className="py-2"><code>elixio_access_token</code></td>
              <td className="py-2">Authenticated API requests</td>
              <td className="py-2">Essential</td>
              <td className="py-2">15 min (sliding)</td>
            </tr>
            <tr className="border-b border-gum-black/20">
              <td className="py-2"><code>elixio_refresh_token</code></td>
              <td className="py-2">Renew access token</td>
              <td className="py-2">Essential</td>
              <td className="py-2">7 days</td>
            </tr>
            <tr className="border-b border-gum-black/20">
              <td className="py-2"><code>elixio-locale</code></td>
              <td className="py-2">Remember your language + RTL flag</td>
              <td className="py-2">Functional</td>
              <td className="py-2">12 months</td>
            </tr>
            <tr className="border-b border-gum-black/20">
              <td className="py-2"><code>elixio-theme</code></td>
              <td className="py-2">Light/dark/system mode + brand palette</td>
              <td className="py-2">Functional</td>
              <td className="py-2">12 months</td>
            </tr>
            <tr className="border-b border-gum-black/20">
              <td className="py-2"><code>elixio-cookie-consent</code></td>
              <td className="py-2">Remember Accept/Decline choice</td>
              <td className="py-2">Essential</td>
              <td className="py-2">12 months</td>
            </tr>
            <tr>
              <td className="py-2"><code>__cf_bm</code> (Cloudflare)</td>
              <td className="py-2">Bot management / DDoS protection</td>
              <td className="py-2">Essential</td>
              <td className="py-2">30 min</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Cookies we do NOT use">
        <p>We do <strong>not</strong> use:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Advertising cookies</strong> — no Google Ads, Facebook Pixel, or
            any other ad-network tracking.
          </li>
          <li>
            <strong>Analytics cookies from third parties</strong> — no Google
            Analytics, Mixpanel, Amplitude, etc. (we may add first-party,
            privacy-preserving analytics in the future, but not via cookies).
          </li>
          <li>
            <strong>Social media tracking pixels</strong> — no Facebook, Twitter, or
            LinkedIn tracking pixels.
          </li>
        </ul>
      </Section>

      <Section title="How to control cookies">
        <p>
          Most browsers let you delete or block cookies through their settings. Note
          that blocking essential cookies (auth, locale, theme) will break the
          Service (you'll be unable to log in or have your language remembered).
        </p>
        <p>
          You can change your cookie consent choice at any time by clearing{" "}
          <code className="rounded bg-gum-cream px-1.5 py-0.5 text-sm">elixio-cookie-consent</code>{" "}
          from your browser's storage and reloading the page.
        </p>
      </Section>

      <Section title="Do Not Track (DNT)">
        <p>
          We honor the DNT browser signal. When DNT is enabled, we set no
          non-essential cookies and skip analytics calls that would track you across
          pages.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We will update this page if we add, remove, or change the purpose of any
          cookie. Material changes will be announced via email.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about cookies? Email{" "}
          <a href="mailto:privacy@elixiodigital.com" className="font-semibold text-gum-purple underline">
            privacy@elixiodigital.com
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