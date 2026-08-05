/*
  Warnings:

  - A unique constraint covering the columns `[userId,dedupKey]` on the table `InAppNotification` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "in_app_notification_dedup";

-- AlterTable
ALTER TABLE "InAppNotification" ADD COLUMN     "dedupKey" TEXT;

-- Backfill dedupKey
UPDATE "InAppNotification" SET "dedupKey" = "type" || ':' || COALESCE("referenceType", 'none') || ':' || COALESCE("referenceId", 'none');

-- CreateIndex
CREATE INDEX "InAppNotification_createdAt_idx" ON "InAppNotification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InAppNotification_userId_dedupKey_key" ON "InAppNotification"("userId", "dedupKey");
