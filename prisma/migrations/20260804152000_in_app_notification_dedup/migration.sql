-- CreateIndex
CREATE UNIQUE INDEX "in_app_notification_dedup" ON "InAppNotification"("userId", "type", "referenceType", "referenceId");
