-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskActivityType" ADD VALUE 'COMMENT_ADDED';
ALTER TYPE "TaskActivityType" ADD VALUE 'MENTIONED';

-- AlterTable
ALTER TABLE "TaskActivity" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "targetUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "eventsReadAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TaskActivity_targetUserId_idx" ON "TaskActivity"("targetUserId");

-- CreateIndex
CREATE INDEX "TaskActivity_groupId_idx" ON "TaskActivity"("groupId");

-- AddForeignKey
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

