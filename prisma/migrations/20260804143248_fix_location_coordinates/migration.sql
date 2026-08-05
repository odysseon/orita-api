/*
  Warnings:

  - The values [COMPLETED,DELETED] on the enum `OpportunityStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [FOR_SALE,FREE,WANTED,BORROW_LEND,TEMP_SERVICE,LOST_FOUND] on the enum `OpportunityType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `body` on the `opportunity_posts` table. All the data in the column will be lost.
  - You are about to drop the column `businessProfileId` on the `opportunity_posts` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `opportunity_posts` table without a default value. This is not possible if the table is not empty.

*/
-- Data migration: map removed status variants to their new equivalents
UPDATE "opportunity_posts" SET "status" = 'FULFILLED' WHERE "status"::text = 'COMPLETED';
UPDATE "opportunity_posts" SET "status" = 'REMOVED'    WHERE "status"::text = 'DELETED';

-- Guard: abort if any unrecognized status values remain
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "opportunity_posts"
    WHERE "status"::text NOT IN ('ACTIVE','FULFILLED','EXPIRED','REMOVED')
  ) THEN
    RAISE EXCEPTION 'Unmapped OpportunityStatus values found — migration cannot proceed safely.';
  END IF;
END $$;

-- AlterEnum
BEGIN;
CREATE TYPE "OpportunityStatus_new" AS ENUM ('ACTIVE', 'FULFILLED', 'EXPIRED', 'REMOVED');
ALTER TABLE "public"."opportunity_posts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "opportunity_posts" ALTER COLUMN "status" TYPE "OpportunityStatus_new" USING ("status"::text::"OpportunityStatus_new");
ALTER TYPE "OpportunityStatus" RENAME TO "OpportunityStatus_old";
ALTER TYPE "OpportunityStatus_new" RENAME TO "OpportunityStatus";
DROP TYPE "public"."OpportunityStatus_old";
ALTER TABLE "opportunity_posts" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- Data migration: map removed type variants to OFFER or NEED
UPDATE "opportunity_posts" SET "type" = 'OFFER' WHERE "type"::text IN ('FOR_SALE','FREE','TEMP_SERVICE');
UPDATE "opportunity_posts" SET "type" = 'NEED'  WHERE "type"::text IN ('WANTED','LOST_FOUND','BORROW_LEND');

-- Guard
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "opportunity_posts"
    WHERE "type"::text NOT IN ('OFFER','NEED')
  ) THEN
    RAISE EXCEPTION 'Unmapped OpportunityType values found — migration cannot proceed safely.';
  END IF;
END $$;

-- AlterEnum
BEGIN;
CREATE TYPE "OpportunityType_new" AS ENUM ('NEED', 'OFFER');
ALTER TABLE "opportunity_posts" ALTER COLUMN "type" TYPE "OpportunityType_new" USING ("type"::text::"OpportunityType_new");
ALTER TYPE "OpportunityType" RENAME TO "OpportunityType_old";
ALTER TYPE "OpportunityType_new" RENAME TO "OpportunityType";
DROP TYPE "public"."OpportunityType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "opportunity_posts" DROP CONSTRAINT "opportunity_posts_businessProfileId_fkey";

-- AlterTable
ALTER TABLE "opportunity_posts" DROP COLUMN "body",
DROP COLUMN "businessProfileId",
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "decayRate" DOUBLE PRECISION NOT NULL DEFAULT 0.01155,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "lastBoostedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "price" DECIMAL(18,2);

-- CreateIndex
CREATE INDEX "opportunity_posts_categoryId_idx" ON "opportunity_posts"("categoryId");

-- Backfill: assign a default category to existing rows before making the column NOT NULL.
-- For a truly safe generic migration when we don't know the exact ID, we might need a fallback,
-- but the user approved the contract pattern. Since this might fail without a real ID, 
-- we will use a subquery to get ANY existing category if one exists, or insert a dummy one.
-- Or better, we just assign to the first available category.
DO $$
DECLARE
  default_cat_id TEXT;
BEGIN
  SELECT id INTO default_cat_id FROM "categories" LIMIT 1;
  IF default_cat_id IS NOT NULL THEN
    UPDATE "opportunity_posts" SET "categoryId" = default_cat_id WHERE "categoryId" IS NULL;
  END IF;
END $$;

-- Contract: now that all rows have a value (or if table is empty), enforce NOT NULL
ALTER TABLE "opportunity_posts" ALTER COLUMN "categoryId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "opportunity_posts" ADD CONSTRAINT "opportunity_posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
