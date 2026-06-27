-- CreateEnum
CREATE TYPE "TaxKind" AS ENUM ('vat', 'gst', 'hst', 'pst', 'qst', 'igst', 'cgst', 'sgst', 'sales', 'iva', 'pis_cofins', 'icms', 'iss', 'consumption', 'none');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "billingCountry" TEXT,
ADD COLUMN     "billingPostal" TEXT,
ADD COLUMN     "billingRegion" TEXT,
ADD COLUMN     "taxCents" INTEGER NOT NULL DEFAULT 0;


-- CreateTable
CREATE TABLE "tax_regions" (
    "id" UUID NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL,
    "kind" "TaxKind" NOT NULL,
    "rate" DECIMAL(8,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "lastVerified" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_line_items" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "kind" "TaxKind" NOT NULL,
    "label" TEXT NOT NULL,
    "region" TEXT,
    "rate" DECIMAL(8,6) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "baseCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_regions_country_region_idx" ON "tax_regions"("country", "region");

-- CreateIndex
CREATE INDEX "tax_regions_isActive_idx" ON "tax_regions"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "tax_regions_country_region_kind_key" ON "tax_regions"("country", "region", "kind");

-- CreateIndex
CREATE INDEX "tax_line_items_orderId_idx" ON "tax_line_items"("orderId");

-- AddForeignKey
ALTER TABLE "tax_line_items" ADD CONSTRAINT "tax_line_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

