-- CreateTable
CREATE TABLE "item_shares" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "embedType" "MessageEmbedType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_shares_embedType_targetId_idx" ON "item_shares"("embedType", "targetId");

-- CreateIndex
CREATE INDEX "item_shares_senderId_recipientId_targetId_createdAt_idx" ON "item_shares"("senderId", "recipientId", "targetId", "createdAt");

-- AddForeignKey
ALTER TABLE "item_shares" ADD CONSTRAINT "item_shares_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_shares" ADD CONSTRAINT "item_shares_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
