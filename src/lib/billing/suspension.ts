// Coupure administrative sur facture impayée (recouvrement).
//
// Flux : (1) une facture échue impayée (dueAt < aujourd'hui, status PENDING) ;
// (2) la boucle de recouvrement du traitement de nuit pose Workspace.suspendedAt
// → l'espace est suspendu (membres ET admins bloqués ; données conservées) ;
// (3) un règlement lève la coupure. Trois voies mènent au règlement, toutes via
// settleInvoice() : le webhook Stripe (invoice.paid), le script superadmin
// (scripts/recouvrement.ts, pour un virement constaté hors-bande) et le paiement
// in-app depuis le détail d'une facture.
//
// La suspension est un ÉTAT STOCKÉ (Workspace.suspendedAt), posé par la nuit et
// levé au règlement — pas un état dérivé.

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

// Constate le règlement d'une facture : la passe en PAID (paidAt = maintenant) si
// elle ne l'est pas déjà, puis lève la coupure de l'espace s'il ne reste PLUS
// AUCUNE facture échue impayée. Idempotent. Point d'entrée unique du règlement,
// partagé par le webhook Stripe, le script de recouvrement et le paiement in-app.
export async function settleInvoice(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
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
