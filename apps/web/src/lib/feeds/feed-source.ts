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
 * These are populated in three ways (in priority order):
 *  1. Real blog posts read from `apps/web/content/blog/*.html` (set via
 *     HarborSEO via scripts/harborseo.py)
 *  2. Hand-curated "announcement" entries below (launches, milestones)
 *  3. (Future) Dynamic items from the live API
 *
 * Sorted newest first by `publishedAt`.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

const blogToFeedItem = (filename: string): FeedItem | null => {
  if (!filename.endsWith(".html")) return null;
  const filePath = path.join(BLOG_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const slug = filename.replace(/\.html$/, "");
  const publishedAt = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
  const updatedAt = data.updated ? new Date(data.updated).toISOString() : publishedAt;
  const title = (data.title as string) ?? slug;
  // Build a clean text-only description for the feed (feeds shouldn't
  // ship raw HTML in <description>, that's what <content:encoded> is for)
  const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const description = (data.description as string) ?? text.slice(0, 240);
  return {
    id: `blog-${slug}`,
    publishedAt,
    updatedAt,
    title,
    description: `<p>${description}</p>`,
    author: (data.author as string) ?? "Elixio Team",
    url: `https://elixiodigital.com/blog/${slug}`,
    categories: Array.isArray(data.categories) ? (data.categories as string[]) : [],
  };
};

const loadBlogItems = (): FeedItem[] => {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .map(blogToFeedItem)
    .filter((x): x is FeedItem => x !== null);
};

/** Hand-curated "announcement" entries (used as fallbacks only) */
const ANNOUNCEMENT_ITEMS: FeedItem[] = [
  {
    id: "elixio-launch-2026",
    publishedAt: "2026-06-27T00:00:00.000Z",
    updatedAt: "2026-06-27T00:00:00.000Z",
    title: "Elixio is live — sell your digital work without the headaches",
    description:
      "<p>Elixio is live. A creator-first marketplace with cross-platform apps (web, iOS, Android, Mac, Windows, Linux), 25+ languages at launch, voice commands, E2E-encrypted delivery, and WCAG 2.1 AA accessibility. We take less than Gumroad and ship more.</p>",
    author: "Elixio Team",
    url: "https://elixiodigital.com/",
    categories: ["announcement", "launch", "creators"],
  },
];

/** All feed items, sorted newest first. */
export const feedItems: FeedItem[] = [...loadBlogItems(), ...ANNOUNCEMENT_ITEMS].sort(
  (a, b) => b.publishedAt.localeCompare(a.publishedAt),
);
