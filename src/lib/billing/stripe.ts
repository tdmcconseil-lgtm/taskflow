import Stripe from "stripe";

// Seam Stripe — un client unique, configurable par variables d'environnement, et
// INACTIF tant que rien n'est configuré (l'encaissement Stripe est alors sauté).
//
// Trois modes, choisis par l'env (aucune réécriture de code pour basculer) :
//   - non configuré : ni STRIPE_SECRET_KEY ni mock → getStripe() renvoie null.
//   - stripe-mock (dev local, sans clé) : STRIPE_MOCK=1 → pointe sur le serveur
//     stripe-mock (http://127.0.0.1:12111 par défaut) avec une clé factice. Sert
//     à vérifier la plomberie des appels SDK ; pas de webhooks ni de vrais flux.
//   - test / live : STRIPE_SECRET_KEY=sk_test_… (ou sk_live_…) → vrai Stripe en
//     bac à sable (cartes de test, webhooks) ou en production.
//
// Le client est mis en cache sur globalThis pour éviter d'en recréer un à chaque
// rechargement à chaud en dev (même motif que src/lib/prisma.ts).

const globalForStripe = globalThis as unknown as {
  stripe: Stripe | null | undefined;
};

function createStripe(): Stripe | null {
  const mock = process.env.STRIPE_MOCK === "1";
  const key = process.env.STRIPE_SECRET_KEY ?? (mock ? "sk_test_mock" : undefined);
  if (!key) return null;

  // Laisse l'apiVersion par défaut épinglée au SDK (évite les décalages de types).
  const config: Stripe.StripeConfig = { typescript: true };

  if (mock) {
    // stripe-mock : HTTP en clair pour éviter les soucis de certificat TLS.
    config.host = process.env.STRIPE_MOCK_HOST ?? "127.0.0.1";
    config.port = Number(process.env.STRIPE_MOCK_PORT ?? 12111);
    config.protocol = "http";
  }

  return new Stripe(key, config);
}

/** Le client Stripe, ou null si Stripe n'est pas configuré. */
export function getStripe(): Stripe | null {
  if (globalForStripe.stripe !== undefined) return globalForStripe.stripe;
  const client = createStripe();
  if (process.env.NODE_ENV !== "production") globalForStripe.stripe = client;
  return client;
}

/** Le client Stripe quand on en a besoin ; lève si Stripe n'est pas configuré. */
export function requireStripe(): Stripe {
  const client = getStripe();
  if (!client) {
    throw new Error(
      "Stripe n'est pas configuré (ni STRIPE_SECRET_KEY ni STRIPE_MOCK=1).",
    );
  }
  return client;
}

/** Vrai si l'encaissement Stripe est actif (clé ou mock configuré). */
export function isStripeConfigured(): boolean {
  return getStripe() !== null;
}
