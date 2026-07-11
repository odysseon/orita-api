/*
  Warnings:

  - Made the column `externalId` on table `locations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `provider` on table `locations` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "locations" ALTER COLUMN "externalId" SET NOT NULL,
ALTER COLUMN "provider" SET NOT NULL;
