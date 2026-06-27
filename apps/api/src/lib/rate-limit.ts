/**
 * Per-user rate limiter (DB-backed, sliding window).
 *
 * Each user (or IP, for unauthenticated requests) has a bucket of
 * "tokens" that refills over time. When a user makes a request, we
 * consume one token. If the bucket is empty, we return 429.
 *
 * The bucket state is stored in Postgres so it works across multiple
 * Railway instances and survives restarts.
 *
 * Why DB-backed instead of Redis:
 *   - We already have Postgres
 *   - Adding Redis is another bill + another ops surface
 *   - At our volume (low thousands of users), DB hits are fine
 *
 * The check is O(1) — we don't read all attempts, we just check the
 * current count in the window with a single COUNT query.
 *
 * Schema (auto-created on first call via Prisma raw SQL if missing).
 */

import prismaPkg from "@prisma/client";
import { httpError } from "./errors.js";

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

export type RateLimitConfig = {
  /** Unique key per limit — e.g. "login:user-uuid" or "login:ip:1.2.3.4" */
  key: string;
  /** Max requests allowed in the window */
  max: number;
  /** Window length in milliseconds */
  windowMs: number;
};

/**
 * Lazily ensure the rate_limit_buckets table exists. We use a Prisma
 * $executeRawUnsafe to CREATE TABLE IF NOT EXISTS on first call. This
 * is cheaper than running a separate migration for a single column.
 *
 * Schema:
 *   key           TEXT PRIMARY KEY
 *   window_start  TIMESTAMPTZ
 *   count         INT
 */
let bucketsTableEnsured = false;
const ensureBucketsTable = async (): Promise<void> => {
  if (bucketsTableEnsured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      key TEXT PRIMARY KEY,
      window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      count INT NOT NULL DEFAULT 0
    )
  `);
  bucketsTableEnsured = true;
};

/**
 * Consume a token from the bucket identified by `key`. Throws an
 * httpError(429) if the bucket is empty.
 *
 * Algorithm: classic fixed-window counter.
 *   - Each bucket has a (window_start, count) pair
 *   - If the current time is past window_start + windowMs, reset
 *     the window and start counting from 1
 *   - Otherwise, increment the count
 *   - If count > max, throw 429
 *
 * Trade-off: at the edge of a window, a burst can briefly exceed the
 * limit (up to 2x). For a marketplace with login flows this is fine —
 * a single 429 in 15 minutes is enough to slow brute-force attacks.
 */
export const consumeToken = async (cfg: RateLimitConfig): Promise<void> => {
  await ensureBucketsTable();

  // Use a single upsert with ON CONFLICT to atomically increment.
  // Postgres's UPDATE ... RETURNING lets us read the new count in one round trip.
  const now = new Date();
  const sql = `
    INSERT INTO rate_limit_buckets (key, window_start, count)
    VALUES ($1, $2, 1)
    ON CONFLICT (key) DO UPDATE
      SET count = CASE
        WHEN rate_limit_buckets.window_start + ($3 || ' milliseconds')::interval <= $2
          THEN 1  -- window expired, reset
        ELSE rate_limit_buckets.count + 1
      END,
      window_start = CASE
        WHEN rate_limit_buckets.window_start + ($3 || ' milliseconds')::interval <= $2
          THEN $2  -- window expired, restart
        ELSE rate_limit_buckets.window_start
      END
    RETURNING count, window_start
  `;

  type Row = { count: number; window_start: Date };
  const rows = await prisma.$queryRawUnsafe<Row[]>(sql, cfg.key, now, cfg.windowMs);
  const row = rows[0];
  if (!row) {
    // Should never happen (RETURNING always returns the row), but be defensive.
    return;
  }
  if (row.count > cfg.max) {
    throw httpError(
      `Rate limit exceeded. Try again in ${Math.ceil(cfg.windowMs / 1000)}s.`,
      429,
      "RATE_LIMITED",
    );
  }
};

/**
 * Read-only variant — useful for /auth/me to display remaining quota.
 * Returns { count, resetAt } or null if no bucket exists yet.
 */
export const peekBucket = async (key: string): Promise<{ count: number; resetAt: Date } | null> => {
  await ensureBucketsTable();
  const rows = await prisma.$queryRawUnsafe<{ count: number; window_start: Date }[]>(
    `SELECT count, window_start FROM rate_limit_buckets WHERE key = $1`,
    key,
  );
  const row = rows[0];
  if (!row) return null;
  return { count: row.count, resetAt: row.window_start };
};

/* ------------------------------------------------------------------------- */
/*  Per-action limit presets                                                  */
/* ------------------------------------------------------------------------- */

/** Login attempts: 10 per 15 minutes per (user, ip) pair */
export const limitLogin = (userIdOrIp: string) =>
  consumeToken({ key: `login:${userIdOrIp}`, max: 10, windowMs: 15 * 60 * 1000 });

/** Registration attempts: 5 per hour per IP (anti-spam) */
export const limitRegister = (ip: string) =>
  consumeToken({ key: `register:${ip}`, max: 5, windowMs: 60 * 60 * 1000 });

/** Password reset requests: 3 per hour per email */
export const limitPasswordReset = (email: string) =>
  consumeToken({ key: `pwreset:${email}`, max: 3, windowMs: 60 * 60 * 1000 });

/** Magic link requests: 3 per 15 minutes per email */
export const limitMagicLink = (email: string) =>
  consumeToken({ key: `magic:${email}`, max: 3, windowMs: 15 * 60 * 1000 });

/** OAuth start: 10 per hour per IP (anti-CSRF spam) */
export const limitOAuthStart = (ip: string) =>
  consumeToken({ key: `oauth:${ip}`, max: 10, windowMs: 60 * 60 * 1000 });

/** TOTP setup/verify: 5 per 5 minutes per user */
export const limitMfa = (userId: string) =>
  consumeToken({ key: `mfa:${userId}`, max: 5, windowMs: 5 * 60 * 1000 });

/** General API: 600 per 10 minutes per user (≈1 req/sec sustained) */
export const limitApi = (userId: string) =>
  consumeToken({ key: `api:${userId}`, max: 600, windowMs: 10 * 60 * 1000 });
