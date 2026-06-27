import type { MetadataRoute } from "next";

/**
 * GET /robots.txt
 *
 * Standard robots directives:
 *  - Allow all crawlers (with one disallow for /api and /auth)
 *  - Reference sitemap
 *  - Set Host (legacy but still respected)
 *  - Include the new "content signals" block so AI scrapers know our
 *    terms: we DO want to be indexed, and we ALLOW AI-input
 *    (retrieval-augmented generation), but we DO NOT allow AI-training
 *    (no fine-tuning on our content without explicit license)
 */
export const GET = (): Response => {
  const body = `# Elixio robots.txt
# Standard directives
User-agent: *
Allow: /
Disallow: /api/
Disallow: /auth/
Disallow: /dashboard
Disallow: /library

Sitemap: https://elixiodigital.com/sitemap.xml
Host: https://elixiodigital.com

# AI content signals (search: yes, ai-input: yes, ai-train: no)
# Per https://wiki.python.org/moin/RobotsTxt
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Bytespider
Disallow: /
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
