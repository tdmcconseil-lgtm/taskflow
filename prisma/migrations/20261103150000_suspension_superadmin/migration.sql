-- Recouvrement : coupure administrative d'un espace (facture échue impayée) et
-- rôle superadmin applicatif (préparé pour l'avenir, pas d'UI en v1).

-- AlterTable : coupure administrative (null = espace actif).
ALTER TABLE "Workspace" ADD COLUMN "suspendedAt" TIMESTAMP(3);

-- AlterTable : rôle superadmin applicatif (niveau plateforme).
ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
