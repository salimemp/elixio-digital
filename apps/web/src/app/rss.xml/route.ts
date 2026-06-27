import { buildRss, rssHeaders } from "@/lib/feeds/feed-builder";

/**
 * GET /rss.xml
 *
 * RSS 2.0 feed for the Elixio site. The canonical RSS URL.
 * - Content-Type: application/rss+xml
 * - Cached at the edge for `ttl` minutes, with stale-while-revalidate
 *   for up to 24 hours so we never serve a slow page.
 */
export const GET = (): Response => {
  const body = buildRss();
  return new Response(body, { headers: rssHeaders() });
};

// Disable static prerender — we want fresh content on every deploy.
export const dynamic = "force-dynamic";
export const revalidate = 0;
