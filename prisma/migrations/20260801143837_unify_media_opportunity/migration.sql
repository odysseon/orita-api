/*
  Warnings:

  - You are about to drop the `opportunity_media` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "opportunity_media" DROP CONSTRAINT "opportunity_media_postId_fkey";

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "opportunityPostId" TEXT;

-- Migrate data from opportunity_media to media
INSERT INTO "media" (
  "id", "fileId", "opportunityPostId", "provider", "mimeType", 
  "format", "version", "width", "height", "bytes", 
  "mediaType", "role", "createdAt"
)
SELECT 
  gen_random_uuid()::text, "fileId", "postId", "provider"::"StorageProvider", "mimeType", 
  "format", "version", "width", "height", "bytes", 
  CASE 
    WHEN "mimeType" LIKE 'video/%' THEN 'VIDEO'::"MediaType"
    ELSE 'IMAGE'::"MediaType"
  END, 
  'GALLERY'::"MediaRole", NOW()
FROM "opportunity_media"
ON CONFLICT ("fileId") DO NOTHING;

-- DropTable
DROP TABLE "opportunity_media";

-- CreateIndex
CREATE INDEX "media_opportunityPostId_idx" ON "media"("opportunityPostId");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_opportunityPostId_fkey" FOREIGN KEY ("opportunityPostId") REFERENCES "opportunity_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
