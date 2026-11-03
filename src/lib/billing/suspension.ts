// Coupure administrative sur facture impayée (recouvrement v1).
//
// Décision produit (Thibaut, 2026-11-03) : PAS de paiement self-service dans
// l'app ni de réouverture automatique. Le flux v1 est :
//   1. une facture échue impayée (dueAt < aujourd'hui, status PENDING) ;
//   2. la boucle de recouvrement du traitement de nuit pose Workspace.suspendedAt
//      → l'espace est suspendu (membres ET admins bloqués ; données conservées) ;
//   3. le virement réel se fait hors-bande ; une fois constaté, le SUPERADMIN
//      lance scripts/recouvrement.ts qui marque la facture payée et lève la
//      coupure. L'admin de l'espace ne peut ni payer ni rouvrir.
//
// La suspension est donc un ÉTAT STOCKÉ (Workspace.suspendedAt), posé par la nuit
// et levé uniquement par le script — pas un état dérivé. Cette fonction sert à la
// boucle de recouvrement et à l'affichage (écran de suspension, script).

import { prisma } from "@/lib/prisma";

export type OverdueInvoice = {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  amountCents: number;
  dueAt: Date;
};

// Factures échues et impayées d'un espace, de la plus ancienne à la plus récente.
export async function overdueInvoices(
  workspaceId: string,
  now: Date = new Date(),
): Promise<OverdueInvoice[]> {
  return prisma.invoice.findMany({
    where: { workspaceId, status: "PENDING", dueAt: { lt: now } },
    orderBy: { periodStart: "asc" },
    select: { id: true, periodStart: true, periodEnd: true, amountCents: true, dueAt: true },
  });
}
