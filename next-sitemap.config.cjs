/** @type {import('next-sitemap').IConfig} */
const fs = require("node:fs");
const path = require("node:path");
const matter = require("gray-matter");

// Discover blog posts at config-load time. Each post becomes a URL
// entry in the sitemap. Posts use the `date` frontmatter as lastmod.
const blogDir = path.join(__dirname, "apps/web/content/blog");
const blogPaths = fs.existsSync(blogDir)
  ? fs
      .readdirSync(blogDir)
      .filter((f) => f.endsWith(".html"))
      .map((f) => {
        const slug = f.replace(/\.html$/, "");
        const raw = fs.readFileSync(path.join(blogDir, f), "utf8");
        const { data } = matter(raw);
        const lastmod =
          (data.date && new Date(data.date).toISOString()) ||
          (data.updated && new Date(data.updated).toISOString()) ||
          new Date().toISOString();
        return {
          loc: `/blog/${slug}`,
          changefreq: "monthly",
          priority: 0.8,
          lastmod,
        };
      })
  : [];

module.exports = {
  siteUrl: "https://elixiodigital.com",
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  changefreq: "weekly",
  priority: 0.7,
  sitemapSize: 5000,

  // Custom robots.txt rules. next-sitemap will produce the file with
  // these + the AI-scraper blocks we list below.
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/", "/dashboard", "/library"],
      },
      // Block major LLM training crawlers. Search engines and AI-input
      // (RAG) bots are still welcome — we want to be found.
      {
        userAgent: ["GPTBot", "ClaudeBot", "anthropic-ai", "Google-Extended", "CCBot", "Bytespider"],
        disallow: "/",
      },
    ],
    // Sitemap(s) and Host are appended automatically.
    additionalSitemaps: [
      "https://elixiodigital.com/rss.xml",
      "https://elixiodigital.com/atom.xml",
    ],
  },

  // Per-route overrides for change-frequency + priority. The first
  // matching prefix wins.
  transform: async (config, path) => {
    let priority = config.priority ?? 0.7;
    let changefreq = config.changefreq ?? "weekly";

    if (path === "/") {
      priority = 1.0;
      changefreq = "daily";
    } else if (path.startsWith("/blog")) {
      priority = 0.8;
      changefreq = "weekly";
    } else if (path.startsWith("/explore") || path.startsWith("/sell")) {
      priority = 0.9;
      changefreq = "daily";
    } else if (path.startsWith("/auth/") || path.startsWith("/dashboard") || path.startsWith("/library")) {
      // Authed/personal routes — don't index
      return null;
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },

  // Additional paths to include in the sitemap. We add blog posts
  // discovered from apps/web/content/blog/*.html here.
  additionalPaths: async (config) => blogPaths,

  // Skip API routes and Next.js internals.
  exclude: [
    "/api/*",
    "/_next/*",
    "/404",
    "/500",
  ],
};
