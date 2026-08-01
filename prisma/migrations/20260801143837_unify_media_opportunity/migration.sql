/*
  Warnings:

  - You are about to drop the `opportunity_media` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "opportunity_media" DROP CONSTRAINT "opportunity_media_postId_fkey";

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "opportunityPostId" TEXT;

-- DropTable
DROP TABLE "opportunity_media";

-- CreateIndex
CREATE INDEX "media_opportunityPostId_idx" ON "media"("opportunityPostId");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_opportunityPostId_fkey" FOREIGN KEY ("opportunityPostId") REFERENCES "opportunity_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
