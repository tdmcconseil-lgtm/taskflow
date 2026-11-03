"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { ensureAdmin } from "@/lib/auth/guards";
import { isStripeConfigured, requireStripe } from "@/lib/billing/stripe";
import { ensureStripeCustomer } from "@/lib/billing/stripe-customer";

const appUrl = () => process.env.APP_URL ?? "http://localhost:3001";

// Démarre un Checkout Stripe en mode « setup » pour enregistrer une carte sur
// l'espace (aucun débit : on mémorise un moyen de paiement pour les prélèvements
// mensuels à venir). Réservé aux administrateurs. Redirige vers la page hébergée
// Stripe, qui renvoie ensuite sur l'administration ; c'est le webhook
// checkout.session.completed qui enregistrera le moyen de paiement par défaut.
export async function startCardSetup(formData: FormData): Promise<void> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  if (!workspaceId) throw new Error("workspaceId manquant");

  const user = await requireUser();
  const denied = await ensureAdmin(user.id, workspaceId);
  if (denied) throw new Error(denied);

  const base = `${appUrl()}/app/workspaces/${workspaceId}/administration`;
  if (!isStripeConfigured()) redirect(`${base}?card=unavailable`);

  const stripe = requireStripe();
  const customerId = await ensureStripeCustomer(workspaceId);

  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    currency: "eur",
    success_url: `${base}?card=ok`,
    cancel_url: `${base}?card=cancel`,
  });

  if (!session.url) throw new Error("Session Checkout sans URL de redirection.");
  redirect(session.url);
}
