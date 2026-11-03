import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/billing/stripe";

// Crée (et finalise) la facture Stripe correspondant à l'une de nos factures
// mensuelles, pour prélèvement automatique sur la carte enregistrée. Appelé par
// le traitement de nuit APRÈS l'émission de notre facture (jamais dans la
// transaction DB : c'est un appel réseau).
//
// No-op si : Stripe non configuré, espace sans Customer Stripe, facture déjà liée
// (stripeInvoiceId présent) ou montant nul (mois à 0 €). Idempotent via des clés
// d'idempotence dérivées de l'id de notre facture. Le résultat du paiement revient
// par le webhook (invoice.paid → facture marquée payée + coupure levée ;
// invoice.payment_failed → laissé au recouvrement de nuit).

function monthLabel(periodStart: Date): string {
  const y = periodStart.getUTCFullYear();
  const m = String(periodStart.getUTCMonth() + 1).padStart(2, "0");
  return `${m}/${y}`;
}

export async function chargeInvoiceViaStripe(invoiceId: string): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      amountCents: true,
      periodStart: true,
      stripeInvoiceId: true,
      workspace: { select: { id: true, stripeCustomerId: true } },
    },
  });
  if (!invoice) return;
  if (invoice.stripeInvoiceId) return; // déjà créée côté Stripe
  const customerId = invoice.workspace.stripeCustomerId;
  if (!customerId) return; // espace sans paiement Stripe configuré
  if (invoice.amountCents <= 0) return; // rien à encaisser (mois à 0 €)

  // 1) Facture Stripe en brouillon (prélèvement automatique).
  const draft = await stripe.invoices.create(
    {
      customer: customerId,
      collection_method: "charge_automatically",
      auto_advance: false,
      metadata: { invoiceId: invoice.id, workspaceId: invoice.workspace.id },
    },
    { idempotencyKey: `inv_${invoice.id}` },
  );
  if (!draft.id) return;

  // On lie tout de suite notre facture à la facture Stripe (évite tout doublon si
  // la finalisation échoue : un prochain passage verra stripeInvoiceId présent).
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { stripeInvoiceId: draft.id },
  });

  // 2) Ligne de facture = montant du mois, rattachée à cette facture Stripe.
  await stripe.invoiceItems.create(
    {
      customer: customerId,
      invoice: draft.id,
      amount: invoice.amountCents,
      currency: "eur",
      description: `getRIDA — facturation ${monthLabel(invoice.periodStart)}`,
    },
    { idempotencyKey: `invitem_${invoice.id}` },
  );

  // 3) Finaliser → déclenche la tentative de prélèvement sur la carte par défaut.
  await stripe.invoices.finalizeInvoice(draft.id);
}
