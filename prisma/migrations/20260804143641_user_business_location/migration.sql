/*
  Warnings:

  - You are about to drop the column `locationId` on the `business_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `activeExplorationLat` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `activeExplorationLng` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `activeExplorationName` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "business_profiles" DROP CONSTRAINT "business_profiles_locationId_fkey";

-- DropIndex
DROP INDEX "business_profiles_locationId_idx";

-- CreateTable
CREATE TABLE "business_locations" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "branchName" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_locations_businessProfileId_idx" ON "business_locations"("businessProfileId");

-- CreateIndex
CREATE INDEX "business_locations_locationId_idx" ON "business_locations"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "business_locations_businessProfileId_locationId_key" ON "business_locations"("businessProfileId", "locationId");

-- === DATA MIGRATION ===
INSERT INTO "business_locations" ("id", "businessProfileId", "locationId", "isPrimary", "createdAt")
SELECT
  'c' || substr(md5(random()::text || id), 1, 24),
  id,
  "locationId",
  true,
  NOW()
FROM "business_profiles"
WHERE "locationId" IS NOT NULL;

CREATE UNIQUE INDEX "business_location_one_primary"
  ON "business_locations" ("businessProfileId")
  WHERE "isPrimary" = true;
-- =======================

-- AlterTable
ALTER TABLE "business_profiles" DROP COLUMN "locationId";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "activeExplorationLat",
DROP COLUMN "activeExplorationLng",
DROP COLUMN "activeExplorationName",
ADD COLUMN     "explorationLat" DOUBLE PRECISION,
ADD COLUMN     "explorationLng" DOUBLE PRECISION,
ADD COLUMN     "homeLocationId" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_homeLocationId_fkey" FOREIGN KEY ("homeLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
