-- Add IP geolocation fields to login_attempts table
ALTER TABLE "login_attempts" ADD COLUMN "country" TEXT;
ALTER TABLE "login_attempts" ADD COLUMN "countryCode" TEXT;
ALTER TABLE "login_attempts" ADD COLUMN "city" TEXT;
ALTER TABLE "login_attempts" ADD COLUMN "isNewLocation" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "login_attempts_userId_createdAt_idx" ON "login_attempts"("userId", "createdAt");

-- Create rate limit buckets table
CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "key" TEXT PRIMARY KEY,
  "window_start" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "count" INTEGER NOT NULL DEFAULT 0
);
