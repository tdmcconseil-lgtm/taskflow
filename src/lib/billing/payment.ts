// Abstraction « fournisseur de paiement » pour la souscription à une offre payante.
//
// Tant qu'aucune clé Stripe n'est configurée, le paiement est SIMULÉ : le
// « checkout » est une page interne de démonstration (aucun Stripe, aucune
// marque, aucune carte demandée, aucun débit). C'est un stub de développement.
//
// Pour brancher Stripe plus tard SANS toucher au flux d'abonnement :
//   - isSimulated() renverra false dès qu'une clé sera présente ;
//   - checkoutPath() sera remplacé par la création d'une Session Stripe Checkout
//     renvoyant son URL, et un webhook appliquera la formule après paiement réel
//     (à la place de l'action de confirmation simulée, cf. resolveSimulatedCheckout).

import type { WorkspacePlan } from "@/lib/plans";

export type CheckoutIntent = {
  workspaceId: string;
  plan: WorkspacePlan;
  budgetEuros?: number;
};

// Paiement simulé tant qu'aucune clé secrète Stripe n'est configurée.
export function isSimulated(): boolean {
  return !process.env.STRIPE_SECRET_KEY;
}

// Chemin de l'étape de paiement. En mode simulé : la page de démo interne.
export function checkoutPath(intent: CheckoutIntent): string {
  const sp = new URLSearchParams({ plan: intent.plan });
  if (intent.budgetEuros != null) sp.set("budget", String(intent.budgetEuros));
  return `/app/workspaces/${intent.workspaceId}/billing/checkout?${sp.toString()}`;
}
