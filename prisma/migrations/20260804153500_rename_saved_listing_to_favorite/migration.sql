ALTER TABLE "saved_listings" RENAME TO "favorites";
ALTER INDEX "saved_listings_userId_listingId_key" RENAME TO "favorites_userId_listingId_key";
ALTER INDEX "saved_listings_userId_idx" RENAME TO "favorites_userId_idx";
ALTER INDEX "saved_listings_listingId_idx" RENAME TO "favorites_listingId_idx";
ALTER TABLE "favorites" RENAME CONSTRAINT "saved_listings_pkey" TO "favorites_pkey";
ALTER TABLE "favorites" RENAME CONSTRAINT "saved_listings_userId_fkey" TO "favorites_userId_fkey";
ALTER TABLE "favorites" RENAME CONSTRAINT "saved_listings_listingId_fkey" TO "favorites_listingId_fkey";
