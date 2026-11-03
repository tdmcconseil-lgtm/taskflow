-- Facturation au mois civil : une facture mensuelle (Invoice) agrège les
-- BillingSegment d'un mois. Les segments deviennent de la comptabilité interne.

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID');

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- AlterTable : rattachement d'un segment à sa facture mensuelle.
ALTER TABLE "BillingSegment" ADD COLUMN "invoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_workspaceId_periodStart_key" ON "Invoice"("workspaceId", "periodStart");
CREATE INDEX "Invoice_workspaceId_idx" ON "Invoice"("workspaceId");
CREATE INDEX "BillingSegment_invoiceId_idx" ON "BillingSegment"("invoiceId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingSegment" ADD CONSTRAINT "BillingSegment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
