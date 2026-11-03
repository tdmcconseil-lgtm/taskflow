import { prisma } from "@/lib/prisma";
import { requireStripe } from "@/lib/billing/stripe";

// Garantit qu'un espace possède un Customer Stripe et renvoie son id.
// Idempotent : réutilise Workspace.stripeCustomerId s'il existe, sinon crée le
// Customer (nom, e-mail de contact et workspaceId en metadata) puis l'enregistre.
// L'appelant doit s'assurer que Stripe est configuré (sinon requireStripe lève).
export async function ensureStripeCustomer(workspaceId: string): Promise<string> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      stripeCustomerId: true,
      organizationProfile: { select: { legalName: true, contactEmail: true } },
    },
  });
  if (!workspace) throw new Error(`Espace introuvable : ${workspaceId}`);
  if (workspace.stripeCustomerId) return workspace.stripeCustomerId;

  const stripe = requireStripe();
  const customer = await stripe.customers.create({
    name: workspace.organizationProfile?.legalName ?? workspace.name,
    email: workspace.organizationProfile?.contactEmail ?? undefined,
    metadata: { workspaceId: workspace.id },
  });

  // Course possible (deux appels concurrents) : si un autre a déjà posé l'id,
  // on garde le premier et on n'écrase pas.
  const updated = await prisma.workspace.updateMany({
    where: { id: workspace.id, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });
  if (updated.count === 0) {
    const fresh = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      select: { stripeCustomerId: true },
    });
    return fresh?.stripeCustomerId ?? customer.id;
  }
  return customer.id;
}
