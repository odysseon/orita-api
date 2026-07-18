/*
  Warnings:

  - You are about to drop the column `avatarId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `avatarUrl` on the `users` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "MediaRole" ADD VALUE 'AVATAR';

-- AlterEnum
ALTER TYPE "UploadOwnerType" ADD VALUE 'USER';

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "avatarId",
DROP COLUMN "avatarUrl",
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "displayName" TEXT;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
