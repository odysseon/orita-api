/*
  Warnings:

  - Changed the type of `embedType` on the `message_embeds` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MessageEmbedType" AS ENUM ('BUSINESS', 'LISTING', 'TOUR', 'LOCATION');

-- AlterTable
ALTER TABLE "message_embeds" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "embedType",
ADD COLUMN     "embedType" "MessageEmbedType" NOT NULL;
