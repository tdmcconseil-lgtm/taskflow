-- Rôles au sein d'un projet (distincts des rôles d'espace).
CREATE TYPE "ProjectMemberRole" AS ENUM ('ADMIN', 'MEMBER');

ALTER TABLE "ProjectAccess" ADD COLUMN "role" "ProjectMemberRole" NOT NULL DEFAULT 'MEMBER';

-- Matérialise le créateur de chaque projet (tâche racine) comme administrateur
-- du projet : on crée l'entrée ProjectAccess si absente, sinon on la promeut.
INSERT INTO "ProjectAccess" (id, "taskId", "userId", role, "createdAt")
SELECT
  'pa_' || substr(md5(random()::text || t.id || t."createdById"), 1, 22),
  t.id,
  t."createdById",
  'ADMIN',
  now()
FROM "Task" t
WHERE t."parentId" IS NULL
ON CONFLICT ("taskId", "userId") DO UPDATE SET role = 'ADMIN';
