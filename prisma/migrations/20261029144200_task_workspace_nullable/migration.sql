-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "workspaceId" TEXT,
ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Task_workspaceId_idx" ON "Task"("workspaceId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
