import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { markStripeInvoicePaid, recordDefaultPaymentMethod } from "@/lib/billing/stripe-sync";

// Webhook Stripe — synchronise les événements de paiement avec notre base.
// La signature est vérifiée sur le CORPS BRUT (req.text()), donc aucune lecture
// du corps avant constructEvent. Runtime Node (SDK Stripe) : c'est le défaut de
// l'App Router, pas besoin de le forcer.
//
// Configurer l'endpoint côté Stripe (ou via le CLI en dev) :
//   stripe listen --forward-to localhost:3001/api/stripe/webhook
// puis mettre le secret (whsec_…) dans STRIPE_WEBHOOK_SECRET.

export async function POST(req: Request): Promise<Response> {
  const stripe = getStripe();
  if (!stripe) return new Response("Stripe non configuré", { status: 503 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook non configuré", { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Signature manquante", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  switch (event.type) {
    // Carte enregistrée via Checkout (mode setup) → mémoriser le moyen de paiement.
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "setup" && session.setup_intent && session.customer) {
        const siId =
          typeof session.setup_intent === "string"
            ? session.setup_intent
            : session.setup_intent.id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer.id;
        const si = await stripe.setupIntents.retrieve(siId);
        const pm =
          typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id;
        if (pm) await recordDefaultPaymentMethod(customerId, pm);
      }
      break;
    }

    // Facture Stripe payée → marquer notre facture payée + lever la coupure.
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice & { id: string };
      await markStripeInvoicePaid(invoice.id);
      break;
    }

    // Échec de paiement : on laisse la facture PENDING ; la boucle de recouvrement
    // du traitement de nuit suspendra l'espace à l'échéance.
    case "invoice.payment_failed":
      break;

    default:
      break;
  }

  return new Response("ok", { status: 200 });
}
