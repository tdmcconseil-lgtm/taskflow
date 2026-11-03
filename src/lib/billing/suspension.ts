// Coupure administrative sur facture impayée (recouvrement v1).
//
// Décision produit (Thibaut, 2026-11-03) : en cas de facture ÉCHUE IMPAYÉE,
// l'espace n'est pas totalement fermé — les membres sont bloqués, mais les
// administrateurs gardent accès à une seule chose : régler les factures. Le
// paiement est adossé à la facture (pas de rapprochement manuel) et, dès que la
// dernière facture échue est réglée, la coupure se lève D'ELLE-MÊME.
//
// La suspension est donc un état DÉRIVÉ (pas un champ en base) : un espace est
// suspendu tant qu'il reste au moins une facture échue (dueAt < maintenant) et
// impayée (status PENDING). Ainsi un paiement rétablit l'accès immédiatement,
// sans attendre le traitement de nuit ni l'intervention d'un superadmin.

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

// Un espace est suspendu dès qu'il a au moins une facture échue impayée.
export async function isWorkspaceSuspended(
  workspaceId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const n = await prisma.invoice.count({
    where: { workspaceId, status: "PENDING", dueAt: { lt: now } },
  });
  return n > 0;
}
