-- Add IP geolocation fields to login_attempts table.
-- Use IF NOT EXISTS so the migration is idempotent and won't fail if
-- some columns were already added manually or by a previous attempt.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'login_attempts' AND column_name = 'country') THEN
    ALTER TABLE "login_attempts" ADD COLUMN "country" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'login_attempts' AND column_name = 'countryCode') THEN
    ALTER TABLE "login_attempts" ADD COLUMN "countryCode" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'login_attempts' AND column_name = 'city') THEN
    ALTER TABLE "login_attempts" ADD COLUMN "city" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'login_attempts' AND column_name = 'isNewLocation') THEN
    ALTER TABLE "login_attempts" ADD COLUMN "isNewLocation" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'login_attempts_userId_createdAt_idx') THEN
    CREATE INDEX "login_attempts_userId_createdAt_idx" ON "login_attempts"("userId", "createdAt");
  END IF;
END $$;

-- Create rate limit buckets table (also idempotent)
CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "key" TEXT PRIMARY KEY,
  "window_start" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "count" INTEGER NOT NULL DEFAULT 0
);
