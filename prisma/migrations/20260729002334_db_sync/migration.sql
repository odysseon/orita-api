-- CreateEnum
CREATE TYPE "ListingAvailability" AS ENUM ('IN_STOCK', 'OUT_OF_STOCK', 'PRE_ORDER');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "availability" "ListingAvailability" NOT NULL DEFAULT 'IN_STOCK';
