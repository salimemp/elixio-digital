-- Persist Aura chat feedback to DB.
--
-- Was previously just logged via app.log.info and lost after the
-- request completed. Now stored as `chat_feedback` rows for
-- product analytics: which KB chunks get voted up vs down, which
-- languages have lowest satisfaction, etc.
--
-- Anonymous feedback allowed (userId nullable). Question/answer
-- truncated at the API layer (2k/8k chars) to keep row size small.
-- We do NOT store IP addresses here (GDPR data-minimization) — the
-- IP is only in the request log for 7 days.

-- Create the enum type
CREATE TYPE "ChatFeedbackRating" AS ENUM ('up', 'down');

-- Create the table
CREATE TABLE "chat_feedback" (
  "id"        UUID                  NOT NULL,
  "userId"    UUID,
  "question"  TEXT                  NOT NULL,
  "answer"    TEXT                  NOT NULL,
  "rating"    "ChatFeedbackRating"  NOT NULL,
  "comment"   TEXT,
  "locale"    TEXT                  NOT NULL DEFAULT 'en',
  "createdAt" TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "chat_feedback_pkey" PRIMARY KEY ("id")
);

-- Indexes — matches schema.prisma
CREATE INDEX "chat_feedback_createdAt_idx"       ON "chat_feedback"("createdAt");
CREATE INDEX "chat_feedback_rating_createdAt_idx" ON "chat_feedback"("rating", "createdAt");
CREATE INDEX "chat_feedback_userId_createdAt_idx" ON "chat_feedback"("userId", "createdAt");

-- FK to users (nullable, ON DELETE SET NULL so user deletion keeps
-- the feedback row for analytics, just anonymous it)
ALTER TABLE "chat_feedback"
  ADD CONSTRAINT "chat_feedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;