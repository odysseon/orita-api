-- AlterEnum
ALTER TYPE "MediaRole" ADD VALUE 'MESSAGE';

-- AlterEnum
ALTER TYPE "UploadOwnerType" ADD VALUE 'CONVERSATION';

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "uploadIntentId" TEXT;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploadIntentId_fkey" FOREIGN KEY ("uploadIntentId") REFERENCES "upload_intents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
