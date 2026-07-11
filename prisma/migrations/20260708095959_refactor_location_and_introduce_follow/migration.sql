/*
  Warnings:

  - You are about to drop the column `locationId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Location` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `saved_businesses` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_locationId_fkey";

-- DropForeignKey
ALTER TABLE "business_profiles" DROP CONSTRAINT "business_profiles_locationId_fkey";

-- DropForeignKey
ALTER TABLE "saved_businesses" DROP CONSTRAINT "saved_businesses_businessProfileId_fkey";

-- DropForeignKey
ALTER TABLE "saved_businesses" DROP CONSTRAINT "saved_businesses_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "locationId";

-- DropTable
DROP TABLE "Location";

-- DropTable
DROP TABLE "saved_businesses";

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "provider" TEXT,
    "name" TEXT NOT NULL,
    "formattedAddress" TEXT,
    "searchText" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "coordinates" geometry(Point,4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- Backfill locations from Location
INSERT INTO "locations" (id, name, latitude, longitude, coordinates, "createdAt", "updatedAt")
SELECT id, name, CAST(ST_Y(coordinates::geometry) AS DOUBLE PRECISION), CAST(ST_X(coordinates::geometry) AS DOUBLE PRECISION), coordinates, "createdAt", "updatedAt" FROM "Location";

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "businessId" TEXT,
    "locationId" TEXT,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "locations_provider_externalId_key" ON "locations"("provider", "externalId");

-- CreateIndex
CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");

-- CreateIndex
CREATE INDEX "follows_businessId_idx" ON "follows"("businessId");

-- CreateIndex
CREATE INDEX "follows_locationId_idx" ON "follows"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_businessId_key" ON "follows"("followerId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_locationId_key" ON "follows"("followerId", "locationId");

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
