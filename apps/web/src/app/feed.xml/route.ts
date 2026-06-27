import { buildRss, rssHeaders } from "@/lib/feeds/feed-builder";

/**
 * GET /feed.xml
 *
 * RSS 2.0 feed — alias for /rss.xml. Some CMSes, blog platforms, and
 * autodiscovery conventions expect the path /feed.xml instead of /rss.xml,
 * so we ship both. Both URLs return the exact same body and headers.
 */
export const GET = (): Response => {
  const body = buildRss();
  return new Response(body, { headers: rssHeaders() });
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
