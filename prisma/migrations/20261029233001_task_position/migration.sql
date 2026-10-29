-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill : position initiale par fratrie (même espace + même parent), selon la date de création.
WITH ordered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "workspaceId", "parentId"
      ORDER BY "createdAt"
    ) - 1 AS rn
  FROM "Task"
)
UPDATE "Task" t
SET "position" = o.rn
FROM ordered o
WHERE t."id" = o."id";
