/*
  Warnings:

  - A unique constraint covering the columns `[fileId]` on the table `media` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mimeType` to the `media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider` to the `media` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('CLOUDINARY', 'BACKBLAZE');

-- CreateEnum
CREATE TYPE "UploadOwnerType" AS ENUM ('BUSINESS_PROFILE', 'LISTING', 'BUSINESS_TOUR', 'REVIEW');

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "bytes" INTEGER,
ADD COLUMN     "duration" DOUBLE PRECISION,
ADD COLUMN     "format" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "provider" "StorageProvider" NOT NULL,
ADD COLUMN     "version" TEXT,
ADD COLUMN     "width" INTEGER;

-- CreateTable
CREATE TABLE "upload_intents" (
    "id" TEXT NOT NULL,
    "ownerType" "UploadOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "role" "MediaRole" NOT NULL,
    "provider" "StorageProvider" NOT NULL,
    "folder" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "upload_intents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upload_intents_ownerId_idx" ON "upload_intents"("ownerId");

-- CreateIndex
CREATE INDEX "upload_intents_createdById_idx" ON "upload_intents"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "media_fileId_key" ON "media"("fileId");

-- AddForeignKey
ALTER TABLE "upload_intents" ADD CONSTRAINT "upload_intents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
