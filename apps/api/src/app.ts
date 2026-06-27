import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerAuth } from "./plugins/auth.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";
import { storefrontRoutes } from "./routes/storefronts.js";
import { assetRoutes } from "./routes/assets.js";
import { statsRoutes } from "./routes/stats.js";
import { categoryRoutes } from "./routes/categories.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  // CORS — single source of truth is env.CORS_ORIGIN (comma-separated).
  // We allow credentials so JWTs in cookies (if we add them) work.
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  });

  // Security headers — HSTS, CSP, X-Frame-Options, etc. Default
  // helmet config is too strict for our /api responses (we serve
  // JSON, not HTML) so we customize. CSP is mostly for browser-side
  // apps that fetch the API; for the API itself we just need to
  // ensure no inline script execution is possible (impossible by
  // virtue of being JSON) and prevent clickjacking (HSTS + X-Frame
  // -Options: DENY).
  await app.register(helmet, {
    // Force HTTPS for 2 years, including subdomains. Browsers will
    // refuse to talk HTTP to us for the next 2 years once they see
    // this header.
    strictTransportSecurity: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      // The API only returns JSON; these directives prevent a misconfigured
      // route from accidentally serving HTML that could run inline JS.
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    // Defense in depth: prevent the API from being framed.
    frameguard: { action: "deny" },
    // Don't leak the framework to attackers.
    hidePoweredBy: true,
    // Browsers should not auto-detect MIME types — prevents content
    // sniffing attacks if a response is mis-served.
    noSniff: true,
    // Disable cross-origin policy for the API since we use CORS instead.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  // Global IP-based rate limit (defense in depth — per-user limits
  // live in lib/rate-limit.ts and apply per-action). This is a
  // coarse catch-all to prevent single IPs from hammering the API.
  await app.register(rateLimit, {
    global: false, // opt-in per route; we use per-action limits
    max: 2000, // 2000 requests
    timeWindow: "1 minute",
    cache: 10_000, // in-memory LRU for 10k IPs
    allowList: (req) => {
      // Allow health checks and Railway internal probes
      const url = req.url ?? "";
      return url === "/health" || url === "/health/";
    },
    keyGenerator: (req) => {
      // Prefer Cloudflare's CF-Connecting-IP (the original client IP)
      // over the direct socket peer (which on Railway is the proxy IP).
      const cf = req.headers["cf-connecting-ip"];
      if (typeof cf === "string") return cf;
      const xff = req.headers["x-forwarded-for"];
      if (typeof xff === "string") return xff.split(",")[0].trim();
      return req.ip;
    },
    errorResponseBuilder: (_req, ctx) => ({
      error: {
        code: "RATE_LIMITED",
        message: `Too many requests. Try again in ${Math.ceil(ctx.ttl / 1000)}s.`,
      },
    }),
  });

  await app.register(sensible);

  await registerErrorHandler(app);
  await registerAuth(app, { secret: env.JWT_SECRET });

  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(userRoutes, { prefix: "/users" });
  await app.register(storefrontRoutes, { prefix: "/storefronts" });
  await app.register(assetRoutes, { prefix: "/assets" });
  await app.register(categoryRoutes, { prefix: "/categories" });
  await app.register(statsRoutes, { prefix: "/stats" });

  return app;
}

export async function closeApp(): Promise<void> {
  await prisma.$disconnect();
}
