/*
  Warnings:

  - You are about to drop the column `email` on the `business_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `isEmailVerified` on the `business_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `isPhoneVerified` on the `business_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `business_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `verificationStatus` on the `business_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedBy` on the `business_verifications` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `storageProvider` to the `business_verification_documents` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `business_verification_documents` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `business_verifications` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BusinessVerificationDocumentType" AS ENUM ('CAC_CERTIFICATE', 'CAC_STATUS_REPORT', 'GOVERNMENT_ID', 'SELFIE', 'PROOF_OF_ADDRESS', 'OTHER');

-- DropForeignKey
ALTER TABLE "InAppNotification" DROP CONSTRAINT "InAppNotification_userId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationPreference" DROP CONSTRAINT "NotificationPreference_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_accountId_fkey";

-- DropForeignKey
ALTER TABLE "business_profiles" DROP CONSTRAINT "business_profiles_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "business_tours" DROP CONSTRAINT "business_tours_createdById_fkey";

-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_followerId_fkey";

-- DropForeignKey
ALTER TABLE "participants" DROP CONSTRAINT "participants_userId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "saved_listings" DROP CONSTRAINT "saved_listings_userId_fkey";

-- DropForeignKey
ALTER TABLE "upload_intents" DROP CONSTRAINT "upload_intents_createdById_fkey";

-- DropIndex
DROP INDEX "business_profiles_verificationStatus_idx";

-- AlterTable
ALTER TABLE "business_profiles" DROP COLUMN "email",
DROP COLUMN "isEmailVerified",
DROP COLUMN "isPhoneVerified",
DROP COLUMN "phoneNumber",
DROP COLUMN "verificationStatus",
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT;

-- AlterTable
ALTER TABLE "business_verification_documents" ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "storageProvider" TEXT NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "BusinessVerificationDocumentType" NOT NULL;

-- AlterTable
ALTER TABLE "business_verifications" DROP COLUMN "reviewedBy",
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "avatarId" TEXT,
    "role" "PlatformRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activeExplorationLat" DOUBLE PRECISION,
    "activeExplorationLng" DOUBLE PRECISION,
    "activeExplorationName" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_accountId_key" ON "users"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_accountId_idx" ON "users"("accountId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_verifications" ADD CONSTRAINT "business_verifications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_intents" ADD CONSTRAINT "upload_intents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_tours" ADD CONSTRAINT "business_tours_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
