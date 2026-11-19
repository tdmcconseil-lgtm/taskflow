-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discoveryMode" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dismissedHints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tourCompletedAt" TIMESTAMP(3);
