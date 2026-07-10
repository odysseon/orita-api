/*
  Warnings:

  - You are about to drop the `_BusinessCategories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_BusinessCategories" DROP CONSTRAINT "_BusinessCategories_A_fkey";

-- DropForeignKey
ALTER TABLE "_BusinessCategories" DROP CONSTRAINT "_BusinessCategories_B_fkey";

-- DropTable
DROP TABLE "_BusinessCategories";

-- CreateTable
CREATE TABLE "business_categories" (
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "business_categories_pkey" PRIMARY KEY ("businessId","categoryId")
);

-- CreateIndex
CREATE INDEX "business_categories_businessId_idx" ON "business_categories"("businessId");

-- CreateIndex
CREATE INDEX "business_categories_categoryId_idx" ON "business_categories"("categoryId");

-- AddForeignKey
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
