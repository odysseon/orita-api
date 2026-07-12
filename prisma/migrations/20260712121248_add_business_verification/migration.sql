-- AlterTable
ALTER TABLE "locations" ALTER COLUMN "externalId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "business_verifications" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "business_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_verification_documents" (
    "id" TEXT NOT NULL,
    "businessVerificationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_verifications_businessId_key" ON "business_verifications"("businessId");

-- CreateIndex
CREATE INDEX "business_verifications_status_idx" ON "business_verifications"("status");

-- CreateIndex
CREATE INDEX "business_verification_documents_businessVerificationId_idx" ON "business_verification_documents"("businessVerificationId");

-- AddForeignKey
ALTER TABLE "business_verifications" ADD CONSTRAINT "business_verifications_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_verification_documents" ADD CONSTRAINT "business_verification_documents_businessVerificationId_fkey" FOREIGN KEY ("businessVerificationId") REFERENCES "business_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
