import { prisma } from "@/lib/prisma";
import { requireStripe } from "@/lib/billing/stripe";

// Synchronisation Stripe → base, appelée par le webhook. Idempotent.

// Marque notre facture (retrouvée par son id Stripe) comme payée, puis lève la
// coupure de l'espace s'il ne reste plus AUCUNE facture échue impayée — même
// règle que le script superadmin (scripts/recouvrement.ts). Sans effet si l'id
// Stripe n'est pas connu (facture d'un autre système / déjà traitée).
export async function markStripeInvoicePaid(stripeInvoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { stripeInvoiceId },
    select: { id: true, workspaceId: true, status: true },
  });
  if (!invoice) return;

  if (invoice.status !== "PAID") {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", paidAt: new Date() },
    });
  }

  const now = new Date();
  const stillOverdue = await prisma.invoice.count({
    where: { workspaceId: invoice.workspaceId, status: "PENDING", dueAt: { lt: now } },
  });
  if (stillOverdue === 0) {
    await prisma.workspace.updateMany({
      where: { id: invoice.workspaceId, suspendedAt: { not: null } },
      data: { suspendedAt: null },
    });
  }
}

// Enregistre le moyen de paiement par défaut d'un espace (après un Checkout en
// mode setup) : le pose comme défaut côté Stripe (pour les prélèvements à venir)
// et le mémorise en base pour l'affichage. Sans effet si le Customer est inconnu.
export async function recordDefaultPaymentMethod(
  stripeCustomerId: string,
  paymentMethodId: string,
): Promise<void> {
  const ws = await prisma.workspace.findUnique({
    where: { stripeCustomerId },
    select: { id: true },
  });
  if (!ws) return;

  const stripe = requireStripe();
  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
  await prisma.workspace.update({
    where: { id: ws.id },
    data: { stripeDefaultPaymentMethodId: paymentMethodId },
  });
}
