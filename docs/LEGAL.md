# Legal Pages

> GDPR-compliant Privacy Policy, Terms of Service, and Cookie Policy. English is the canonical legal text. Other locales get a translation notice.

---

## Overview

Elixio Digital publishes three legal pages at `/privacy`, `/terms`, `/cookies`. They are server components that render in English by default and show a translation notice when the user's locale is non-English.

| Page | URL | Sections | Last reviewed |
| --- | --- | --- | --- |
| Privacy Policy | [`/privacy`](https://elixiodigital.com/privacy) | 12 sections | 28 June 2026 |
| Terms of Service | [`/terms`](https://elixiodigital.com/terms) | 14 sections | 28 June 2026 |
| Cookie Policy | [`/cookies`](https://elixiodigital.com/cookies) | 8 sections | 28 June 2026 |

## Privacy Policy (`/privacy`)

12 sections covering:

1. **Who we are** — Data controller, contact email
2. **What data we collect** — Account, auth metadata, creator content, buyer activity, usage
3. **How we use your data** — Per-purpose + GDPR Article 6 legal bases
4. **Cookies and similar technologies** — 4 localStorage keys + Cloudflare `__cf_bm`
5. **Who we share data with** — Cloudflare, Railway, Cloudflare R2, Resend, Google Gemini, Stripe/Razorpay, ipapi.co
6. **International transfers** — SCCs for EEA/UK/CH transfers to US-hosted Railway
7. **Data retention** — Account, auth logs (90d), tax records (7y), backups (35d)
8. **Your rights** — Access, Rectification, Erasure, Restriction, Portability, Object, Withdraw consent, Lodge complaint
9. **Security** — TLS 1.3, AES-256, bcrypt, HSTS, CSP, rate limits, new-location alerts
10. **Children** — 16+ minimum, 7-day deletion on discovery
11. **Changes to this policy** — 30-day notice for material changes
12. **Contact** — `privacy@elixiodigital.com`

## Terms of Service (`/terms`)

14 sections covering:

1. Acceptance
2. Eligibility (16+/18+)
3. Accounts (security responsibilities, 2FA recommended)
4. Buyer terms (license scope, refunds, taxes)
5. Creator terms (ownership, IP rights, prohibited content, fees, delivery)
6. Prohibited content (IP infringement, malware, CSAM, hate speech, fraud)
7. Platform fees (8% platform + 2.9% Stripe = ~10.9% total; weekly payouts via Stripe Connect, $10 min)
8. Intellectual property
9. Disclaimers and liability (capped at greater of 12-month fees or $100)
10. Indemnification
11. Termination
12. Disputes and governing law (India; consumer protections respected for EEA/UK)
13. Changes (30-day notice)
14. Contact (`legal@elixiodigital.com`)

## Cookie Policy (`/cookies`)

8 sections:

1. **What is a cookie?** — Plain-language definition
2. **Cookies we use** — 6-row table (auth tokens, locale, theme, consent, Cloudflare bot mgmt)
3. **Cookies we do NOT use** — No advertising, no third-party analytics, no social pixels
4. **How to control cookies** — Browser settings, manual reset of `elixio-cookie-consent`
5. **Do Not Track (DNT)** — Honored
6. **Changes to this policy** — 30-day notice
7. **Contact** (`privacy@elixiodigital.com`)
8. **Table of cookies** with Name / Purpose / Type / Duration columns

## Translation notice

All three pages show a `<TranslationNotice>` banner when the user's locale is non-English. The component lives at `apps/web/src/components/legal/TranslationNotice.tsx`.

```tsx
// Server component — reads cookie server-side
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, resolveLocaleFromCookie, type Locale } from "@/lib/i18n";

export function TranslationNotice() {
  const cookieStore = cookies();
  const locale: Locale = resolveLocaleFromCookie(cookieStore.get("locale")?.value) ?? DEFAULT_LOCALE;

  if (locale === "en") return null;  // no banner for English speakers

  return (
    <aside className="mb-8 rounded-2xl border-2 border-gum-yellow bg-gum-cream p-5">
      <p className="mb-2 text-sm font-extrabold ink-default">
        📜 Translation notice — {languageName}
      </p>
      <p className="text-sm ink-muted">
        This is a courtesy translation. The canonical legal text is in
        English (below). If there is any difference between this
        translation and the English version, the English version
        prevails. For the legally binding version, see the{" "}
        <a href="/" className="font-semibold text-gum-purple underline">
          English version
        </a>.
      </p>
    </aside>
  );
}
```

The banner is included in each legal page immediately after the title + "Last updated" line.

## Why we don't auto-translate legal pages

1. **Legal enforceability**: Most jurisdictions require legal text to be in a language the user demonstrably understands, but they also require the canonical binding text to be specific (often the language in which the contract is filed). We chose English as canonical because:
   - It's the lingua franca of international e-commerce.
   - It's the legal language we draft in.
   - Our service is global; English is the safe default.
2. **Translation drift**: Machine translation introduces risk of meaning drift, especially for liability caps and jurisdictional clauses. A court might invalidate a clause that doesn't match the canonical version.
3. **Professional translation cost**: Legal translation via a sworn translator costs $0.15-$0.30/word. Our legal pages total ~6,000 words = $900-$1,800 per language. For 42 locales = $37k-$75k. Not feasible until Elixio has paying users in those jurisdictions.

The notice is the right user experience: it gives confidence that the binding text is in a known language, while still being welcoming in the user's preferred language.

## Cookie banner (`<CookieBanner>`)

Beyond the policy page, Elixio shows a consent banner on first visit (stored in `localStorage["elixio-cookie-consent"]`).

- **First visit** (no consent): banner slides up 800ms after first paint (delayed so it doesn't compete with LCP).
- **Accept**: stores `"accepted"`, hides banner. Accepts all current cookie usage (we don't have non-essential cookies).
- **Decline**: stores `"declined"`, hides banner. Functionally equivalent to Accept today (no difference in cookies set), but reserved for future use when we add non-essential cookies (e.g. analytics).
- **Equal-prominence buttons**: no dark patterns. Accept and Decline are the same size and color.
- **Re-show**: clear `elixio-cookie-consent` from localStorage and reload.
- **12-month expiry**: GDPR Article 5(1)(e) storage limitation. We re-prompt annually (planned).

## GDPR / CCPA compliance summary

| Requirement | Implementation |
| --- | --- |
| Lawful basis (Art. 6) | Documented per processing purpose in privacy policy §3 |
| Data subject rights (Art. 15-22) | Listed in privacy policy §8, exercised via `privacy@elixiodigital.com` |
| Right to erasure (Art. 17) | User can request account deletion; 30-day grace period before hard delete |
| Data portability (Art. 20) | JSON export of user data (planned, currently partial via API) |
| Records of processing (Art. 30) | Audit logs via `LoginAttempt` + registration logs in `logs/*.log` |
| Breach notification (Art. 33) | 72-hour notification procedure documented in security runbook |
| DPO contact | `privacy@elixiodigital.com` |
| International transfers (Art. 44-50) | SCCs for US-hosted Railway (documented in privacy policy §6) |
| Cookie consent (ePrivacy) | Banner with equal-prominence Accept/Decline + 12-month expiry |
| Children's data (COPPA / Art. 8) | 16+ minimum, 7-day deletion on discovery |

CCPA-specific (California):

- Right to know (`privacy@elixiodigital.com`)
- Right to delete (same)
- Right to opt-out of sale (we don't sell data)
- Non-discrimination (we don't discriminate based on privacy choices)

## Reference

- Pages: [`apps/web/src/app/privacy/page.tsx`](./../apps/web/src/app/privacy/page.tsx), [`/terms`](./../apps/web/src/app/terms/page.tsx), [`/cookies`](./../apps/web/src/app/cookies/page.tsx)
- Notice component: [`apps/web/src/components/legal/TranslationNotice.tsx`](./../apps/web/src/components/legal/TranslationNotice.tsx)
- Cookie banner: [`apps/web/src/components/layout/CookieBanner.tsx`](./../apps/web/src/components/layout/CookieBanner.tsx)
- Footer link: [`apps/web/src/components/layout/Footer.tsx`](./../apps/web/src/components/layout/Footer.tsx)
- Security practices: [`docs/SECURITY.md`](./SECURITY.md)