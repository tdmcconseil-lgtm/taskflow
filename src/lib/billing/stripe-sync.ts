import { prisma } from "@/lib/prisma";
import { requireStripe } from "@/lib/billing/stripe";
import { settleInvoice } from "@/lib/billing/suspension";

// Synchronisation Stripe → base, appelée par le webhook. Idempotent.

// Retrouve notre facture par son id Stripe et la constate payée (passage PAID +
// levée de coupure éventuelle, via settleInvoice). Sans effet si l'id Stripe est
// inconnu (facture d'un autre système / déjà traitée).
export async function markStripeInvoicePaid(stripeInvoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { stripeInvoiceId },
    select: { id: true },
  });
  if (!invoice) return;
  await settleInvoice(invoice.id);
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
