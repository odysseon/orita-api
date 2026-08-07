-- DropIndex
DROP INDEX "outbox_events_publishedAt_availableAt_idx";

-- AlterTable
ALTER TABLE "outbox_events" ADD COLUMN     "deadLetteredAt" TIMESTAMP(3),
ADD COLUMN     "leasedBy" TEXT,
ADD COLUMN     "leasedUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "outbox_events_publishedAt_availableAt_leasedUntil_idx" ON "outbox_events"("publishedAt", "availableAt", "leasedUntil");
