-- AlterTable Workspace : cycle de facturation ancré + choix d'offre en attente.
ALTER TABLE "Workspace" ADD COLUMN "billingCycleStart" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN "pendingPlan" "WorkspacePlan";
ALTER TABLE "Workspace" ADD COLUMN "pendingBudgetCapCents" INTEGER;
ALTER TABLE "Workspace" ADD COLUMN "lastBilledOn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BillingSegment" (
    "id" TEXT NOT NULL,
    "plan" "WorkspacePlan" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "billableUsers" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "BillingSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingSegment_workspaceId_idx" ON "BillingSegment"("workspaceId");

-- AddForeignKey
ALTER TABLE "BillingSegment" ADD CONSTRAINT "BillingSegment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill : les espaces déjà sur une offre payante démarrent leur cycle au jour
-- du déploiement (pas de facturation rétroactive). FREE reste sans cycle.
UPDATE "Workspace"
SET "billingCycleStart" = date_trunc('day', CURRENT_TIMESTAMP)
WHERE "plan" <> 'FREE';
