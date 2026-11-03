-- Identifiants Stripe pour l'encaissement des factures mensuelles.

-- Workspace : Customer Stripe + moyen de paiement par défaut.
ALTER TABLE "Workspace" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "stripeDefaultPaymentMethodId" TEXT;
CREATE UNIQUE INDEX "Workspace_stripeCustomerId_key" ON "Workspace"("stripeCustomerId");

-- Invoice : facture Stripe miroir (synchronisée par le webhook).
ALTER TABLE "Invoice" ADD COLUMN "stripeInvoiceId" TEXT;
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");
