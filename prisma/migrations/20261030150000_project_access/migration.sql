-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('WORKSPACE', 'RESTRICTED');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "visibility" "ProjectVisibility" NOT NULL DEFAULT 'RESTRICTED';

-- Les projets déjà existants restent visibles par tout l'espace (aucun changement
-- d'accès pour l'existant ; seuls les NOUVEAUX projets sont restreints par défaut).
UPDATE "Task" SET "visibility" = 'WORKSPACE';

-- CreateTable
CREATE TABLE "ProjectAccess" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ProjectAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectAccess_taskId_idx" ON "ProjectAccess"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAccess_taskId_userId_key" ON "ProjectAccess"("taskId", "userId");

-- AddForeignKey
ALTER TABLE "ProjectAccess" ADD CONSTRAINT "ProjectAccess_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAccess" ADD CONSTRAINT "ProjectAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
