"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/dal";
import { ensureAdmin } from "@/lib/auth/guards";

const paySchema = z.object({
  workspaceId: z.string().min(1),
  invoiceId: z.string().min(1),
});

// Règle une facture mensuelle depuis l'écran d'administration (réservé aux
// administrateurs de l'espace). Le paiement est ADOSSÉ À LA FACTURE : la marquer
// payée EST la constatation du paiement (pas de rapprochement manuel, cf. décision
// produit). En v1 (pas encore de clé Stripe) aucune transaction réelle n'est
// traitée ici — le règlement effectif se fait hors-bande ; l'encaissement
// carte/SEPA se branchera dessus plus tard sans changer ce flux.
//
// La coupure éventuelle étant dérivée des factures échues impayées
// (cf. lib/billing/suspension), régler la dernière facture échue rétablit l'accès
// immédiatement : on revalide tout le sous-arbre de l'espace.
export async function payInvoice(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = paySchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    invoiceId: formData.get("invoiceId"),
  });
  if (!parsed.success) return;

  const { workspaceId, invoiceId } = parsed.data;
  if (await ensureAdmin(user.id, workspaceId)) return;

  // updateMany + filtre status PENDING : idempotent (un double clic ne repaie pas)
  // et borné à une facture de CET espace.
  await prisma.invoice.updateMany({
    where: { id: invoiceId, workspaceId, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date() },
  });

  revalidatePath(`/app/workspaces/${workspaceId}`, "layout");
  redirect(`/app/workspaces/${workspaceId}/administration`);
}
