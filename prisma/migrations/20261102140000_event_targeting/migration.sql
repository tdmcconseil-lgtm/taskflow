-- Nouveaux types d'événements : décision et document ajoutés à une tâche.
ALTER TYPE "TaskActivityType" ADD VALUE IF NOT EXISTS 'DECISION_ADDED';
ALTER TYPE "TaskActivityType" ADD VALUE IF NOT EXISTS 'DOCUMENT_ADDED';

-- Ciblage de l'élément exact (commentaire / décision / document) depuis le flux.
ALTER TABLE "TaskActivity" ADD COLUMN "targetId" TEXT;
