-- CreateEnum
CREATE TYPE "ServiceAreaType" AS ENUM ('INHERIT', 'RADIUS', 'POLYGON', 'ADMIN_REGION', 'NATIONWIDE', 'REMOTE');

-- CreateEnum
CREATE TYPE "ServiceMode" AS ENUM ('AT_LOCATION', 'MOBILE', 'REMOTE', 'DELIVERY', 'PICKUP');

-- CreateTable
CREATE TABLE "administrative_regions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "countryCode" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "administrative_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_service_modes" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "mode" "ServiceMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_service_modes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_service_areas" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "name" TEXT,
    "type" "ServiceAreaType" NOT NULL,
    "administrativeRegionId" TEXT,
    "radiusKm" INTEGER,
    "centerGeography" geography(Point,4326),
    "polygonGeometry" geometry(MultiPolygon,4326),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_service_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_service_areas" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "name" TEXT,
    "type" "ServiceAreaType" NOT NULL DEFAULT 'INHERIT',
    "administrativeRegionId" TEXT,
    "radiusKm" INTEGER,
    "centerGeography" geography(Point,4326),
    "polygonGeometry" geometry(MultiPolygon,4326),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_service_areas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "administrative_regions_code_key" ON "administrative_regions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "business_service_modes_businessProfileId_mode_key" ON "business_service_modes"("businessProfileId", "mode");

-- CreateIndex
CREATE INDEX "business_service_areas_businessProfileId_idx" ON "business_service_areas"("businessProfileId");

-- CreateIndex
CREATE INDEX "listing_service_areas_listingId_idx" ON "listing_service_areas"("listingId");

-- AddForeignKey
ALTER TABLE "administrative_regions" ADD CONSTRAINT "administrative_regions_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "administrative_regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_service_modes" ADD CONSTRAINT "business_service_modes_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_service_areas" ADD CONSTRAINT "business_service_areas_administrativeRegionId_fkey" FOREIGN KEY ("administrativeRegionId") REFERENCES "administrative_regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_service_areas" ADD CONSTRAINT "business_service_areas_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_service_areas" ADD CONSTRAINT "listing_service_areas_administrativeRegionId_fkey" FOREIGN KEY ("administrativeRegionId") REFERENCES "administrative_regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_service_areas" ADD CONSTRAINT "listing_service_areas_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
