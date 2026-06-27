/**
 * Feed source — the canonical list of items that go into the site's
 * RSS / Atom / feed.xml outputs.
 *
 * Add new entries by pushing to `items` below. Each item becomes a
 * <item>/<entry> in the generated feeds.
 *
 * In the future this can be replaced with:
 *   - An MDX/Markdown blog under `apps/web/content/blog/*.mdx` (use
 *     `gray-matter` + `next-mdx-remote` to read at request time)
 *   - A live API fetch from the Fastify backend (`fetch(API_URL + '/assets?limit=20')`)
 *   - A CMS like Sanity, Contentful, or a Postgres table
 *
 * For now, a static array keeps the feeds populated from day one.
 */

export type FeedItem = {
  /** Unique ID, used as <guid> in RSS and <id> in Atom */
  id: string;
  /** ISO 8601 publish date */
  publishedAt: string;
  /** Updated date, optional. Falls back to publishedAt */
  updatedAt?: string;
  /** Item title */
  title: string;
  /** Item description / summary (HTML allowed in description) */
  description: string;
  /** Author display name */
  author: string;
  /** URL to the item on the site */
  url: string;
  /** Optional categories / tags */
  categories?: string[];
};

export type FeedConfig = {
  /** Site title shown in the channel */
  title: string;
  /** Short tagline / description */
  description: string;
  /** Canonical site URL */
  siteUrl: string;
  /** Default language code (BCP 47) */
  language: string;
  /** Editor / webmaster email (rss <managingEditor>) */
  managingEditor: string;
  /** Copyright string */
  copyright: string;
  /** TTL in minutes — how often readers should refetch */
  ttl: number;
  /** Logo URL (for Atom) */
  logoUrl?: string;
};

export const feedConfig: FeedConfig = {
  title: "Elixio",
  description:
    "Creator-first marketplace for digital assets. Sell templates, design files, code, music, 3D, and more — without the headaches.",
  siteUrl: "https://elixiodigital.com",
  language: "en-us",
  managingEditor: "hello@elixiodigital.com (Elixio Team)",
  copyright: `© ${new Date().getFullYear()} Elixio. All rights reserved.`,
  ttl: 60,
  logoUrl: "https://elixiodigital.com/elixio-mark.svg",
};

/**
 * The actual feed items.
 *
 * These are populated in two ways:
 *  1. Hand-curated "announcement" entries (launches, milestones, big features)
 *  2. (Future) Dynamic items from the blog MDX dir or the assets API
 *
 * Sorted newest first by `publishedAt`.
 */
export const feedItems: FeedItem[] = [
  {
    id: "elixio-launch-2026",
    publishedAt: "2026-06-27T00:00:00.000Z",
    updatedAt: "2026-06-27T00:00:00.000Z",
    title: "Introducing Elixio — sell your digital work without the headaches",
    description:
      "<p>Elixio is live. A creator-first marketplace with cross-platform apps (web, iOS, Android, Mac, Windows, Linux), 25+ languages at launch, voice commands, E2E-encrypted delivery, and WCAG 2.1 AA accessibility. We take less than Gumroad and ship more.</p><p>Read on to see what we built, why it matters, and how to claim your creator profile in under 5 minutes.</p>",
    author: "Elixio Team",
    url: "https://elixiodigital.com/blog/introducing-elixio",
    categories: ["announcement", "launch", "creators"],
  },
  {
    id: "elixio-vs-gumroad-2026",
    publishedAt: "2026-06-26T00:00:00.000Z",
    updatedAt: "2026-06-26T00:00:00.000Z",
    title: "Elixio vs Gumroad: 2026 fee comparison (with the real math)",
    description:
      "<p>How much does Gumroad actually take? We crunch the numbers across 8 plans, 3 currencies, and a creator earning $1K, $10K, and $100K per month. Plus, a side-by-side feature comparison and a free migration tool.</p>",
    author: "Elixio Team",
    url: "https://elixiodigital.com/vs-gumroad",
    categories: ["comparison", "creators", "pricing"],
  },
  {
    id: "elixio-vs-lemon-squeezy-2026",
    publishedAt: "2026-06-25T00:00:00.000Z",
    title: "Elixio vs Lemon Squeezy: which is better for indie creators?",
    description:
      "<p>Both are merchant-of-record platforms with low fees. But they differ in payout speed, subscription tools, and the kinds of products you can sell. We compare head-to-head across 14 dimensions.</p>",
    author: "Elixio Team",
    url: "https://elixiodigital.com/vs-lemon-squeezy",
    categories: ["comparison", "creators", "pricing"],
  },
  {
    id: "elixio-pricing-2026",
    publishedAt: "2026-06-24T00:00:00.000Z",
    title: "Elixio pricing: simple, honest, and lower than everyone else",
    description:
      "<p>Elixio charges a flat 5% platform fee on sales. No monthly minimums, no listing fees, no payment processing surcharges. Here's how that compares to Gumroad (10%), Lemon Squeezy (5% + 50¢), CodeCanyon (30-50%), and Creative Market (30-70%).</p>",
    author: "Elixio Team",
    url: "https://elixiodigital.com/pricing",
    categories: ["pricing", "creators"],
  },
  {
    id: "elixio-cross-platform-2026",
    publishedAt: "2026-06-22T00:00:00.000Z",
    title: "One marketplace, six platforms: how we shipped Elixio everywhere",
    description:
      "<p>Web, iOS, Android, macOS, Windows, Linux. Same code, same data, same experience. We talk through the monorepo structure, the build pipeline, and the trade-offs we made to ship to all six in one quarter.</p>",
    author: "Elixio Team",
    url: "https://elixiodigital.com/blog/cross-platform-launch",
    categories: ["engineering", "behind-the-scenes"],
  },
];
