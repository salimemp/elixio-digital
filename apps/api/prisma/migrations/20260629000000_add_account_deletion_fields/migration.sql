-- Account deletion (GDPR Art. 17 + CCPA Right to Delete)
-- Adds:
--   - `deletedAt`           tombstone set at delete-request time
--   - `scheduledHardDeleteAt` 30-day grace deadline (Phase 2 background job)
-- - Makes `passwordHash` nullable so password login is invalidated on delete.

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "scheduledHardDeleteAt" TIMESTAMP(3);

ALTER TABLE "users"
  ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Index for the background hard-delete job (Phase 2). Lets it find
-- candidates due today without a full table scan.
CREATE INDEX "users_deletedAt_scheduledHardDeleteAt_idx"
  ON "users"("deletedAt", "scheduledHardDeleteAt");

-- Comment for future maintainers — explains WHY the index exists
COMMENT ON INDEX "users_deletedAt_scheduledHardDeleteAt_idx"
  IS 'Phase 2 hard-delete sweep: WHERE deletedAt IS NOT NULL AND scheduledHardDeleteAt <= now()';