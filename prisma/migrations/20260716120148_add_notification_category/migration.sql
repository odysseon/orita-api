-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('SOCIAL', 'BUSINESS', 'LISTING', 'REVIEW', 'SYSTEM');

-- AlterTable
ALTER TABLE "InAppNotification" ADD COLUMN     "category" "NotificationCategory" NOT NULL DEFAULT 'SYSTEM';

-- AlterTable
ALTER TABLE "conversation_participants" ADD COLUMN     "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
