-- AlterTable
ALTER TABLE "conversation_anchors" ADD COLUMN     "opportunityId" TEXT;

-- AlterTable
ALTER TABLE "opportunity_posts" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT;

-- AddForeignKey
ALTER TABLE "conversation_anchors" ADD CONSTRAINT "conversation_anchors_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunity_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
