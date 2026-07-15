/*
  Warnings:

  - You are about to drop the `follows` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_businessId_fkey";

-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_followerId_fkey";

-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_locationId_fkey";


-- CreateTable
CREATE TABLE "business_follows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_follows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_follows_userId_idx" ON "business_follows"("userId");

-- CreateIndex
CREATE INDEX "business_follows_businessId_idx" ON "business_follows"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "business_follows_userId_businessId_key" ON "business_follows"("userId", "businessId");

-- CreateIndex
CREATE INDEX "location_follows_userId_idx" ON "location_follows"("userId");

-- CreateIndex
CREATE INDEX "location_follows_locationId_idx" ON "location_follows"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "location_follows_userId_locationId_key" ON "location_follows"("userId", "locationId");

-- CreateIndex
CREATE INDEX "user_follows_followerId_idx" ON "user_follows"("followerId");

-- CreateIndex
CREATE INDEX "user_follows_followingId_idx" ON "user_follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_followerId_followingId_key" ON "user_follows"("followerId", "followingId");

-- AddForeignKey
ALTER TABLE "business_follows" ADD CONSTRAINT "business_follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_follows" ADD CONSTRAINT "business_follows_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_follows" ADD CONSTRAINT "location_follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_follows" ADD CONSTRAINT "location_follows_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate Business Follows
INSERT INTO "business_follows" ("id", "userId", "businessId", "notificationsEnabled", "createdAt")
SELECT "id", "followerId", "businessId", "notificationsEnabled", "createdAt"
FROM "follows"
WHERE "businessId" IS NOT NULL;

-- Migrate Location Follows
INSERT INTO "location_follows" ("id", "userId", "locationId", "notificationsEnabled", "createdAt")
SELECT "id", "followerId", "locationId", "notificationsEnabled", "createdAt"
FROM "follows"
WHERE "locationId" IS NOT NULL;

-- DropTable
DROP TABLE "follows";

