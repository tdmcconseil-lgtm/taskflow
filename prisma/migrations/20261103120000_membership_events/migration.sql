-- CreateEnum
CREATE TYPE "MembershipEventType" AS ENUM ('ACTIVATED', 'DEACTIVATED');

-- CreateTable
CREATE TABLE "MembershipEvent" (
    "id" TEXT NOT NULL,
    "type" "MembershipEventType" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "MembershipEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipEvent_workspaceId_idx" ON "MembershipEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "MembershipEvent_userId_idx" ON "MembershipEvent"("userId");

-- CreateIndex
CREATE INDEX "MembershipEvent_workspaceId_at_idx" ON "MembershipEvent"("workspaceId", "at");

-- AddForeignKey
ALTER TABLE "MembershipEvent" ADD CONSTRAINT "MembershipEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipEvent" ADD CONSTRAINT "MembershipEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill : reconstitue l'historique à partir de l'état courant des
-- appartenances. Chaque membre a été ACTIVÉ à la date de création de son
-- appartenance ; les membres désactivés portent en plus un événement DÉSACTIVÉ
-- à la date de désactivation. Ainsi le journal suffit à reconstituer les
-- périodes d'activité de chaque membre.
INSERT INTO "MembershipEvent" ("id", "type", "at", "userId", "workspaceId")
SELECT
  'me_' || substr(md5(random()::text || m.id || 'activated'), 1, 22),
  'ACTIVATED',
  m."createdAt",
  m."userId",
  m."workspaceId"
FROM "Membership" m;

INSERT INTO "MembershipEvent" ("id", "type", "at", "userId", "workspaceId")
SELECT
  'me_' || substr(md5(random()::text || m.id || 'deactivated'), 1, 22),
  'DEACTIVATED',
  m."deactivatedAt",
  m."userId",
  m."workspaceId"
FROM "Membership" m
WHERE m."deactivatedAt" IS NOT NULL;
