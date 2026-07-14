-- CreateTable
CREATE TABLE "user_interested_categories" (
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interested_categories_pkey" PRIMARY KEY ("userId","categoryId")
);

-- CreateTable
CREATE TABLE "category_discovery_policies" (
    "categoryId" TEXT NOT NULL,
    "feedRadiusKm" INTEGER NOT NULL DEFAULT 15,
    "notificationRadiusKm" INTEGER NOT NULL DEFAULT 5,
    "searchRadiusKm" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "category_discovery_policies_pkey" PRIMARY KEY ("categoryId")
);

-- CreateIndex
CREATE INDEX "user_interested_categories_userId_idx" ON "user_interested_categories"("userId");

-- CreateIndex
CREATE INDEX "user_interested_categories_categoryId_idx" ON "user_interested_categories"("categoryId");

-- AddForeignKey
ALTER TABLE "user_interested_categories" ADD CONSTRAINT "user_interested_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interested_categories" ADD CONSTRAINT "user_interested_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_discovery_policies" ADD CONSTRAINT "category_discovery_policies_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
