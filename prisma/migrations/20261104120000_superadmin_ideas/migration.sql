-- Pilotage des idées par le superadmin : statut de traitement (affiché
-- publiquement) et réponses officielles de l'équipe (publiques).

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('EN_ATTENTE', 'A_LETUDE', 'IMPLEMENTEE');

-- AlterTable : statut de traitement d'une idée (défaut : en attente).
ALTER TABLE "Idea" ADD COLUMN "status" "IdeaStatus" NOT NULL DEFAULT 'EN_ATTENTE';

-- CreateTable : réponse officielle de l'équipe sur une idée.
CREATE TABLE "IdeaComment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ideaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "IdeaComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdeaComment_ideaId_idx" ON "IdeaComment"("ideaId");

-- AddForeignKey
ALTER TABLE "IdeaComment" ADD CONSTRAINT "IdeaComment_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaComment" ADD CONSTRAINT "IdeaComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
