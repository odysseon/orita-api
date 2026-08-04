-- CreateTable
CREATE TABLE "business_stats" (
    "businessId" TEXT NOT NULL,
    "aggregateRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "lastReconciledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_stats_pkey" PRIMARY KEY ("businessId")
);

-- AddForeignKey
ALTER TABLE "business_stats" ADD CONSTRAINT "business_stats_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
