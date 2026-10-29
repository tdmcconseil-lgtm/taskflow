-- AlterTable
ALTER TABLE "TaskFollow" ADD COLUMN     "following" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastReadAt" TIMESTAMP(3);
