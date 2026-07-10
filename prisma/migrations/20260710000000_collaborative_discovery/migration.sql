-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "ConversationParticipantRole" AS ENUM ('OWNER', 'MEMBER');

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_businessProfileId_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_listingId_fkey";

-- DropForeignKey
ALTER TABLE "conversation_participants" DROP CONSTRAINT "conversation_participants_userId_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_senderId_fkey";

-- DropForeignKey
ALTER TABLE "message_read_receipts" DROP CONSTRAINT "message_read_receipts_userId_fkey";

-- DropIndex
DROP INDEX "conversations_businessProfileId_idx";

-- DropIndex
DROP INDEX "conversation_participants_userId_idx";

-- DropIndex
DROP INDEX "messages_conversationId_idx";

-- DropIndex
DROP INDEX "messages_senderId_idx";

-- DropIndex
DROP INDEX "message_read_receipts_messageId_idx";

-- DropIndex
DROP INDEX "message_read_receipts_userId_idx";

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "businessProfileId",
DROP COLUMN "listingId",
DROP COLUMN "subject",
ADD COLUMN     "anchorId" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "type" "ConversationType" NOT NULL DEFAULT 'DIRECT';

-- AlterTable
ALTER TABLE "conversation_participants" DROP CONSTRAINT "conversation_participants_pkey",
DROP COLUMN "userId",
ADD COLUMN     "participantId" TEXT NOT NULL,
ADD COLUMN     "role" "ConversationParticipantRole" NOT NULL DEFAULT 'MEMBER',
ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversationId", "participantId");

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "referenceId",
DROP COLUMN "referenceType",
DROP COLUMN "senderId",
ADD COLUMN     "participantId" TEXT NOT NULL,
ADD COLUMN     "senderAvatarUrl" TEXT,
ADD COLUMN     "senderDisplayName" TEXT NOT NULL,
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "message_read_receipts" DROP CONSTRAINT "message_read_receipts_pkey",
DROP COLUMN "userId",
ADD COLUMN     "participantId" TEXT NOT NULL,
ADD CONSTRAINT "message_read_receipts_pkey" PRIMARY KEY ("messageId", "participantId");

-- DropEnum
DROP TYPE "MessageReferenceType";

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "businessProfileId" TEXT,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_anchors" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "listingId" TEXT,
    "tourId" TEXT,
    "locationId" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "conversation_anchors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_embeds" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "embedType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaPath" TEXT,

    CONSTRAINT "message_embeds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participants_userId_key" ON "participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "participants_businessProfileId_key" ON "participants"("businessProfileId");

-- CreateIndex
CREATE INDEX "message_embeds_messageId_idx" ON "message_embeds"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_anchorId_key" ON "conversations"("anchorId");

-- CreateIndex
CREATE INDEX "conversations_type_idx" ON "conversations"("type");

-- CreateIndex
CREATE INDEX "conversation_participants_participantId_idx" ON "conversation_participants"("participantId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "messages_participantId_idx" ON "messages"("participantId");

-- CreateIndex
CREATE INDEX "message_read_receipts_participantId_idx" ON "message_read_receipts"("participantId");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_anchors" ADD CONSTRAINT "conversation_anchors_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_anchors" ADD CONSTRAINT "conversation_anchors_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_anchors" ADD CONSTRAINT "conversation_anchors_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "business_tours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_anchors" ADD CONSTRAINT "conversation_anchors_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_anchorId_fkey" FOREIGN KEY ("anchorId") REFERENCES "conversation_anchors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_embeds" ADD CONSTRAINT "message_embeds_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

