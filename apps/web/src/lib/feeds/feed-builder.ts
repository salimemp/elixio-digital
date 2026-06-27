/**
 * Shared feed utilities for RSS 2.0, Atom 1.0, and JSON Feed.
 *
 * Why three formats?
 *   - rss.xml / feed.xml — RSS 2.0, the historical standard. Every
 *     reader (NetNewsWire, Feedly, Inoreader, etc.) supports it.
 *   - atom.xml — Atom 1.0, the IETF standard (RFC 4287). Preferred by
 *     some readers and required for podcasting use cases.
 *   - (Optional) feed.json — JSON Feed 1.1, modern and dead simple.
 *     We don't ship it yet but the helpers below are written so adding
 *     it is a 5-line change.
 *
 * The route handlers in app/{rss,atom,feed}.xml/route.ts call these
 * helpers to produce the response body and headers.
 */

import { feedConfig, feedItems, type FeedItem } from "./feed-source";

const escapeXml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const escapeCdata = (s: string): string => s.replace(/\]\]>/g, "]]]]><![CDATA[>");

/** RFC 822 date string (used in RSS pubDate) */
const toRfc822 = (iso: string): string => new Date(iso).toUTCString();

/** ISO 8601 date string (used in Atom updated/published) */
const toIso = (iso: string): string => new Date(iso).toISOString();

const sortedItems = (items: FeedItem[]): FeedItem[] =>
  [...items].sort((a, b) =>
    (b.updatedAt ?? b.publishedAt).localeCompare(a.updatedAt ?? a.publishedAt),
  );

/* ------------------------------------------------------------------------- */
/*  RSS 2.0                                                                  */
/* ------------------------------------------------------------------------- */

export const buildRss = (): string => {
  const items = sortedItems(feedItems);
  const lastBuild = toRfc822(items[0]?.updatedAt ?? items[0]?.publishedAt ?? new Date().toISOString());

  const itemsXml = items
    .map((item) => {
      const cats = (item.categories ?? [])
        .map((c) => `      <category>${escapeXml(c)}</category>`)
        .join("\n");
      return `    <item>
      <title><![CDATA[${escapeCdata(item.title)}]]></title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
      <pubDate>${toRfc822(item.publishedAt)}</pubDate>
      <description><![CDATA[${escapeCdata(item.description)}]]></description>
      <author>${escapeXml(feedConfig.managingEditor.replace(/\s+\(.+\)$/, ""))} (${escapeXml(item.author)})</author>
${cats}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(feedConfig.title)}</title>
    <link>${escapeXml(feedConfig.siteUrl)}</link>
    <atom:link href="${escapeXml(feedConfig.siteUrl)}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(feedConfig.description)}</description>
    <language>${escapeXml(feedConfig.language)}</language>
    <managingEditor>${escapeXml(feedConfig.managingEditor)}</managingEditor>
    <copyright>${escapeXml(feedConfig.copyright)}</copyright>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <ttl>${feedConfig.ttl}</ttl>
${itemsXml}
  </channel>
</rss>
`;
};

/* ------------------------------------------------------------------------- */
/*  Atom 1.0                                                                 */
/* ------------------------------------------------------------------------- */

export const buildAtom = (): string => {
  const items = sortedItems(feedItems);
  const updated = toIso(items[0]?.updatedAt ?? items[0]?.publishedAt ?? new Date().toISOString());

  const entriesXml = items
    .map((item) => {
      const cats = (item.categories ?? [])
        .map(
          (c) => `      <category term="${escapeXml(c.toLowerCase().replace(/\s+/g, "-"))}" label="${escapeXml(c)}" />`,
        )
        .join("\n");
      return `    <entry>
      <id>${escapeXml(item.id)}</id>
      <title>${escapeXml(item.title)}</title>
      <link rel="alternate" type="text/html" href="${escapeXml(item.url)}" />
      <published>${toIso(item.publishedAt)}</published>
      <updated>${toIso(item.updatedAt ?? item.publishedAt)}</updated>
      <author>
        <name>${escapeXml(item.author)}</name>
      </author>
      <summary type="html">${escapeXml(item.description)}</summary>
${cats}
    </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(feedConfig.siteUrl)}/</id>
  <title>${escapeXml(feedConfig.title)}</title>
  <subtitle>${escapeXml(feedConfig.description)}</subtitle>
  <link rel="self" type="application/atom+xml" href="${escapeXml(feedConfig.siteUrl)}/atom.xml" />
  <link rel="alternate" type="text/html" href="${escapeXml(feedConfig.siteUrl)}" />
  <updated>${updated}</updated>
  <logo>${escapeXml(feedConfig.logoUrl ?? feedConfig.siteUrl + "/elixio-mark.svg")}</logo>
  <icon>${escapeXml(feedConfig.siteUrl + "/icon.svg")}</icon>
  <rights>${escapeXml(feedConfig.copyright)}</rights>
  <generator uri="https://nextjs.org" version="14">Next.js</generator>
${entriesXml}
</feed>
`;
};

/* ------------------------------------------------------------------------- */
/*  Headers                                                                  */
/* ------------------------------------------------------------------------- */

export const rssHeaders = (): HeadersInit => ({
  "Content-Type": "application/rss+xml; charset=utf-8",
  "Cache-Control": `public, max-age=${feedConfig.ttl * 60}, s-maxage=${feedConfig.ttl * 60}, stale-while-revalidate=${feedConfig.ttl * 60 * 24}`,
});

export const atomHeaders = (): HeadersInit => ({
  "Content-Type": "application/atom+xml; charset=utf-8",
  "Cache-Control": `public, max-age=${feedConfig.ttl * 60}, s-maxage=${feedConfig.ttl * 60}, stale-while-revalidate=${feedConfig.ttl * 60 * 24}`,
});
