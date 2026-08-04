/*
  Warnings:

  - The values [COMPLETED,DELETED] on the enum `OpportunityStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [FOR_SALE,FREE,WANTED,BORROW_LEND,TEMP_SERVICE,LOST_FOUND] on the enum `OpportunityType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `body` on the `opportunity_posts` table. All the data in the column will be lost.
  - You are about to drop the column `businessProfileId` on the `opportunity_posts` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `opportunity_posts` table without a default value. This is not possible if the table is not empty.

*/
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
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "decayRate" DOUBLE PRECISION NOT NULL DEFAULT 0.01155,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "lastBoostedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "price" DECIMAL(18,2);

-- CreateIndex
CREATE INDEX "opportunity_posts_categoryId_idx" ON "opportunity_posts"("categoryId");

-- AddForeignKey
ALTER TABLE "opportunity_posts" ADD CONSTRAINT "opportunity_posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
