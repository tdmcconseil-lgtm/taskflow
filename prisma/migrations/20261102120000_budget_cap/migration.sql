-- AlterTable: plafond de budget mensuel (centimes) par espace, null = non défini.
ALTER TABLE "Workspace" ADD COLUMN "budgetCapCents" INTEGER;
