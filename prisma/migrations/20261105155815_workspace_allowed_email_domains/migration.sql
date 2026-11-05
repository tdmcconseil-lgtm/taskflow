-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "allowedEmailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[];
