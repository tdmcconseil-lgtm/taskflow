-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_projectId_fkey";

-- DropIndex
DROP INDEX "Task_projectId_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "projectId",
ALTER COLUMN "workspaceId" SET NOT NULL;

-- DropTable
DROP TABLE "Project";
