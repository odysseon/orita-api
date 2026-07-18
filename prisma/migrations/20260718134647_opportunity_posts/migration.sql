-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('FOR_SALE', 'FREE', 'WANTED', 'BORROW_LEND', 'TEMP_SERVICE', 'LOST_FOUND');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'DELETED');

-- AlterEnum
ALTER TYPE "MessageEmbedType" ADD VALUE 'OPPORTUNITY';

-- AlterEnum
ALTER TYPE "UploadOwnerType" ADD VALUE 'OPPORTUNITY_POST';

-- CreateTable
CREATE TABLE "opportunity_posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "businessProfileId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "type" "OpportunityType" NOT NULL,
    "locationId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" "OpportunityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunity_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_media" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "provider" "StorageProvider" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "format" TEXT,
    "version" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opportunity_posts_status_expiresAt_idx" ON "opportunity_posts"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "opportunity_posts_authorId_idx" ON "opportunity_posts"("authorId");

-- CreateIndex
CREATE INDEX "opportunity_posts_locationId_idx" ON "opportunity_posts"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_media_fileId_key" ON "opportunity_media"("fileId");

-- CreateIndex
CREATE INDEX "opportunity_media_postId_idx" ON "opportunity_media"("postId");

-- AddForeignKey
ALTER TABLE "opportunity_posts" ADD CONSTRAINT "opportunity_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_posts" ADD CONSTRAINT "opportunity_posts_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_posts" ADD CONSTRAINT "opportunity_posts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_media" ADD CONSTRAINT "opportunity_media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "opportunity_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
