-- DropForeignKey
ALTER TABLE "business_tours" DROP CONSTRAINT "business_tours_createdById_fkey";

-- DropForeignKey
ALTER TABLE "item_shares" DROP CONSTRAINT "item_shares_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "item_shares" DROP CONSTRAINT "item_shares_senderId_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_participantId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_reviewerId_fkey";

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_tours" ADD CONSTRAINT "business_tours_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_shares" ADD CONSTRAINT "item_shares_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_shares" ADD CONSTRAINT "item_shares_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
