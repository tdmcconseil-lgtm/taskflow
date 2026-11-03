"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { ensureAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { settleInvoice } from "@/lib/billing/suspension";

// Paiement d'une facture depuis l'app, lancé par le formulaire de la page de
// paiement (billing/invoices/[invoiceId]/pay).
//
// ÉTAT ACTUEL = DÉMO : ce bouton ne débite rien. Il simule un règlement réussi
// (facture PENDING → PAID + levée de coupure via settleInvoice), le temps de
// câbler les écrans. Le vrai encaissement se branchera ICI : création/relecture
// de la facture Stripe puis redirection vers sa page hébergée (hosted_invoice_url).
// La confirmation réelle reviendra alors par le webhook invoice.paid (déjà en
// place) et ce raccourci de simulation sera retiré. La page affiche un bandeau
// « démonstration » tant que ce raccourci est actif.
export async function payInvoice(formData: FormData): Promise<void> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!workspaceId || !invoiceId) throw new Error("Paramètres manquants");

  const user = await requireUser();
  const denied = await ensureAdmin(user.id, workspaceId);
  if (denied) throw new Error(denied);

  const detail = `/app/workspaces/${workspaceId}/billing/invoices/${invoiceId}`;

  // La facture doit appartenir à l'espace et être en attente (sinon rien à payer).
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId, status: "PENDING" },
    select: { id: true },
  });
  if (!invoice) redirect(detail);

  // PLACEHOLDER (démo) : règlement simulé, aucun débit réel. À remplacer par la
  // redirection vers la page de paiement Stripe (cf. en-tête).
  await settleInvoice(invoice.id);

  redirect(detail);
}
