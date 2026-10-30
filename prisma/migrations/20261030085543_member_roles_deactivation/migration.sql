-- AlterEnum
ALTER TYPE "WorkspaceRole" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "deactivatedAt" TIMESTAMP(3);

