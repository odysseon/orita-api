/*
  Warnings:

  - You are about to drop the column `category` on the `InAppNotification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InAppNotification" ADD COLUMN "preferenceCategory" TEXT NOT NULL DEFAULT 'system';

-- Data Migration
UPDATE "InAppNotification"
SET "preferenceCategory" = CASE
    WHEN "category"::text = 'SOCIAL' THEN 'following'
    WHEN "category"::text = 'BUSINESS' THEN 'following'
    WHEN "category"::text = 'LISTING' THEN 'nearbyDiscoveries'
    WHEN "category"::text = 'REVIEW' THEN 'messages'
    ELSE 'system'
END;

ALTER TABLE "InAppNotification" DROP COLUMN "category";

-- DropEnum
DROP TYPE "NotificationCategory";
