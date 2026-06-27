-- CreateEnum
CREATE TYPE "AITaskKind" AS ENUM ('listing_copywriter', 'asset_critique', 'sales_coach', 'metadata_seo');

-- CreateEnum
CREATE TYPE "AIJobStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "asset_views" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "viewerId" UUID,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_downloads" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "grantId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generations" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "kind" "AITaskKind" NOT NULL,
    "status" "AIJobStatus" NOT NULL DEFAULT 'pending',
    "inputJson" JSONB NOT NULL,
    "outputJson" JSONB,
    "errorMessage" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "assetId" UUID,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniqueViewers" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "revenueCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_operations" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "affectedIds" TEXT[],
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_views_assetId_createdAt_idx" ON "asset_views"("assetId", "createdAt");

-- CreateIndex
CREATE INDEX "asset_views_viewerId_createdAt_idx" ON "asset_views"("viewerId", "createdAt");

-- CreateIndex
CREATE INDEX "asset_views_createdAt_idx" ON "asset_views"("createdAt");

-- CreateIndex
CREATE INDEX "asset_downloads_assetId_createdAt_idx" ON "asset_downloads"("assetId", "createdAt");

-- CreateIndex
CREATE INDEX "asset_downloads_buyerId_createdAt_idx" ON "asset_downloads"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_generations_creatorId_createdAt_idx" ON "ai_generations"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_generations_creatorId_kind_idx" ON "ai_generations"("creatorId", "kind");

-- CreateIndex
CREATE INDEX "ai_generations_status_idx" ON "ai_generations"("status");

-- CreateIndex
CREATE INDEX "analytics_snapshots_creatorId_date_idx" ON "analytics_snapshots"("creatorId", "date");

-- CreateIndex
CREATE INDEX "analytics_snapshots_assetId_date_idx" ON "analytics_snapshots"("assetId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_creatorId_assetId_date_key" ON "analytics_snapshots"("creatorId", "assetId", "date");

-- CreateIndex
CREATE INDEX "bulk_operations_creatorId_createdAt_idx" ON "bulk_operations"("creatorId", "createdAt");

-- AddForeignKey
ALTER TABLE "asset_views" ADD CONSTRAINT "asset_views_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_views" ADD CONSTRAINT "asset_views_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_downloads" ADD CONSTRAINT "asset_downloads_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_downloads" ADD CONSTRAINT "asset_downloads_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_downloads" ADD CONSTRAINT "asset_downloads_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "download_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_operations" ADD CONSTRAINT "bulk_operations_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

