-- CreateEnum
CREATE TYPE "MessageReferenceType" AS ENUM ('BUSINESS', 'LISTING', 'TOUR');

-- CreateEnum
CREATE TYPE "DiscoveryItemType" AS ENUM ('BUSINESS', 'LISTING', 'TOUR', 'PROMOTION');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "referenceType" "MessageReferenceType";

-- CreateTable
CREATE TABLE "discovery_items" (
    "id" TEXT NOT NULL,
    "itemType" "DiscoveryItemType" NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discovery_items_businessProfileId_idx" ON "discovery_items"("businessProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_items_itemType_referenceId_key" ON "discovery_items"("itemType", "referenceId");

-- AddForeignKey
ALTER TABLE "discovery_items" ADD CONSTRAINT "discovery_items_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
