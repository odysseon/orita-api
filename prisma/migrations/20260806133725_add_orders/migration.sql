/*
  Warnings:

  - A unique constraint covering the columns `[orderId]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'FULFILLING', 'COMPLETION_REQUESTED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "orderId" TEXT;

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "opportunityId" TEXT,
    "buyerId" TEXT NOT NULL,
    "buyerBusinessId" TEXT,
    "sellerUserId" TEXT,
    "sellerBusinessId" TEXT,
    "conversationId" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "agreedPrice" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "scheduledFor" TIMESTAMP(3),
    "note" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "fulfillingAt" TIMESTAMP(3),
    "completionRequestedAt" TIMESTAMP(3),
    "completionRequestedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orders_buyerId_status_idx" ON "orders"("buyerId", "status");

-- CreateIndex
CREATE INDEX "orders_sellerUserId_status_idx" ON "orders"("sellerUserId", "status");

-- CreateIndex
CREATE INDEX "orders_sellerBusinessId_status_idx" ON "orders"("sellerBusinessId", "status");

-- CreateIndex
CREATE INDEX "orders_conversationId_idx" ON "orders"("conversationId");

-- CreateIndex
CREATE INDEX "orders_listingId_idx" ON "orders"("listingId");

-- CreateIndex
CREATE INDEX "orders_opportunityId_idx" ON "orders"("opportunityId");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_orderId_key" ON "reviews"("orderId");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyerBusinessId_fkey" FOREIGN KEY ("buyerBusinessId") REFERENCES "business_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sellerBusinessId_fkey" FOREIGN KEY ("sellerBusinessId") REFERENCES "business_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunity_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Subject XOR: exactly one of listingId / opportunityId
ALTER TABLE "orders" ADD CONSTRAINT "order_subject_xor" CHECK (
  (("listingId" IS NOT NULL)::int + ("opportunityId" IS NOT NULL)::int) = 1
);

-- Seller XOR: exactly one of sellerUserId / sellerBusinessId
ALTER TABLE "orders" ADD CONSTRAINT "order_seller_xor" CHECK (
  (("sellerUserId" IS NOT NULL)::int + ("sellerBusinessId" IS NOT NULL)::int) = 1
);
