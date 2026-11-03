// Recouvrement — outil du SUPERADMIN (dev/exploitation, non importé par l'app).
// Lancé par Thibaut quand un virement a été constaté hors-bande. C'est la SEULE
// façon de constater un paiement et de lever une coupure : il n'y a pas de
// paiement self-service dans l'app, et l'admin d'un espace ne peut ni se marquer
// payé ni rouvrir son espace.
//
// Usage (depuis la racine du projet ; cible la base pointée par DATABASE_URL) :
//   npx tsx scripts/recouvrement.ts list
//       → espaces suspendus et/ou avec une facture échue impayée, et leurs factures
//   npx tsx scripts/recouvrement.ts pay <invoiceId>
//       → marque la facture payée ; si l'espace n'a plus de facture échue impayée,
//         lève la coupure (réactive l'espace)
//   npx tsx scripts/recouvrement.ts reopen <workspaceId>
//       → lève la coupure d'un espace sans paiement (geste commercial / correction)
//
// En v1, « payer » enregistre seulement le paiement sur la facture (le virement
// réel est hors-bande). L'encaissement carte/SEPA se branchera dessus plus tard.

import "dotenv/config";
import { prisma } from "@/lib/prisma";

const day = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "—");
const euros = (c: number) => `${(c / 100).toFixed(2)} €`;

async function list() {
  const now = new Date();
  const wss = await prisma.workspace.findMany({
    where: {
      OR: [
        { suspendedAt: { not: null } },
        { invoices: { some: { status: "PENDING", dueAt: { lt: now } } } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      suspendedAt: true,
      invoices: {
        where: { status: "PENDING" },
        orderBy: { periodStart: "asc" },
        select: { id: true, periodStart: true, amountCents: true, dueAt: true },
      },
    },
  });
  if (wss.length === 0) return console.log("Aucun espace à recouvrer.");
  for (const w of wss) {
    console.log(
      `${w.id}  ${w.suspendedAt ? `SUSPENDU (${day(w.suspendedAt)})` : "actif"}  « ${w.name} »`,
    );
    for (const inv of w.invoices) {
      const overdue = inv.dueAt.getTime() < now.getTime();
      console.log(
        `   facture ${inv.id}  ${day(inv.periodStart).slice(0, 7)}  ${euros(inv.amountCents)}  échéance ${day(
          inv.dueAt,
        )}${overdue ? "  ÉCHUE" : ""}`,
      );
    }
  }
}

async function pay(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, workspaceId: true, status: true, amountCents: true },
  });
  if (!invoice) throw new Error(`Facture introuvable : ${invoiceId}`);
  if (invoice.status === "PAID") {
    console.log(`Facture ${invoiceId} déjà payée.`);
  } else {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "PAID", paidAt: new Date() },
    });
    console.log(`Facture ${invoiceId} marquée payée (${euros(invoice.amountCents)}).`);
  }

  // Lever la coupure uniquement s'il ne reste AUCUNE facture échue impayée.
  const now = new Date();
  const stillOverdue = await prisma.invoice.count({
    where: { workspaceId: invoice.workspaceId, status: "PENDING", dueAt: { lt: now } },
  });
  if (stillOverdue > 0) {
    console.log(`Espace toujours suspendu : ${stillOverdue} facture(s) échue(s) restante(s).`);
    return;
  }
  const updated = await prisma.workspace.updateMany({
    where: { id: invoice.workspaceId, suspendedAt: { not: null } },
    data: { suspendedAt: null },
  });
  console.log(updated.count > 0 ? "Coupure levée : espace réactivé." : "Aucune coupure à lever.");
}

async function reopen(workspaceId: string) {
  const updated = await prisma.workspace.updateMany({
    where: { id: workspaceId, suspendedAt: { not: null } },
    data: { suspendedAt: null },
  });
  console.log(updated.count > 0 ? `Espace ${workspaceId} réactivé.` : "Aucune coupure à lever.");
}

async function main() {
  const [cmd, a] = process.argv.slice(2);
  switch (cmd) {
    case "list":
      await list();
      break;
    case "pay":
      if (!a) throw new Error("usage: pay <invoiceId>");
      await pay(a);
      break;
    case "reopen":
      if (!a) throw new Error("usage: reopen <workspaceId>");
      await reopen(a);
      break;
    default:
      console.log("Commandes : list | pay <invoiceId> | reopen <workspaceId>");
  }
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
