"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { IdeaStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth/superadmin-guard";
import { settleInvoice } from "@/lib/billing/suspension";
import { getDictionary, zodError } from "@/lib/i18n/server";

export type FormState = { error?: string } | undefined;

// Statuts d'idée autorisés (doit refléter l'enum Prisma IdeaStatus).
const STATUSES: IdeaStatus[] = ["EN_ATTENTE", "A_LETUDE", "IMPLEMENTEE", "ECARTEE"];

const commentSchema = z.string().trim().min(1, "commentRequired").max(2000, "commentTooLong");

// Revalide la console superadmin ET la page Idées publique (statut + réponses y
// sont visibles de tous).
function revalidateIdeas() {
  revalidatePath("/app/superadmin");
  revalidatePath("/app/idees");
}

// Change le statut de traitement d'une idée (pilotage superadmin).
export async function setIdeaStatus(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const ideaId = String(formData.get("ideaId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!ideaId || !STATUSES.includes(status as IdeaStatus)) return;

  await prisma.idea.update({
    where: { id: ideaId },
    data: { status: status as IdeaStatus },
  });
  revalidateIdeas();
}

// Publie une réponse officielle de l'équipe sous une idée (visible de tous).
export async function addIdeaComment(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const t = await getDictionary();

  const ideaId = String(formData.get("ideaId") ?? "");
  const parsed = commentSchema.safeParse(formData.get("body") ?? "");
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
  }

  const idea = await prisma.idea.findUnique({ where: { id: ideaId }, select: { id: true } });
  if (!idea) return { error: t.superadmin.ideaGone };

  await prisma.ideaComment.create({
    data: { ideaId, body: parsed.data, authorId: user.id },
  });
  revalidateIdeas();
  return undefined;
}

// Supprime une réponse officielle (modération superadmin).
export async function deleteIdeaComment(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const commentId = String(formData.get("commentId") ?? "");
  if (!commentId) return;

  await prisma.ideaComment.deleteMany({ where: { id: commentId } });
  revalidateIdeas();
}

// --- Recouvrement (console superadmin) ---

// Motif de réouverture sans paiement (geste commercial) : obligatoire.
const reasonSchema = z.string().trim().min(3, "reasonRequired").max(500, "reasonTooLong");

// Constate le paiement d'une facture (virement constaté hors-bande) depuis la
// console. Réutilise settleInvoice (PAID + lève la coupure s'il ne reste aucune
// facture échue) puis journalise l'action. Sans motif. La liste n'affiche que des
// factures PENDING, donc on ignore une facture déjà payée.
export async function markInvoicePaid(formData: FormData): Promise<void> {
  const user = await requireSuperAdmin();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!invoiceId) return;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, workspaceId: true, status: true },
  });
  if (!invoice || invoice.status === "PAID") return;

  await settleInvoice(invoice.id);
  await prisma.recoveryAction.create({
    data: { type: "PAY", workspaceId: invoice.workspaceId, invoiceId: invoice.id, actorId: user.id },
  });
  revalidatePath("/app/superadmin");
}

// Rouvre un espace suspendu SANS paiement (geste commercial) : lève la coupure et
// journalise avec un motif obligatoire. N'agit que si l'espace est bien suspendu.
export async function reopenWorkspace(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const t = await getDictionary();

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const parsed = reasonSchema.safeParse(formData.get("reason") ?? "");
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
  }

  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, suspendedAt: true },
  });
  if (!ws) return { error: t.superadmin.workspaceGone };
  if (!ws.suspendedAt) return { error: t.superadmin.notSuspended };

  await prisma.workspace.update({
    where: { id: ws.id },
    data: { suspendedAt: null },
  });
  await prisma.recoveryAction.create({
    data: { type: "REOPEN", workspaceId: ws.id, reason: parsed.data, actorId: user.id },
  });
  revalidatePath("/app/superadmin");
  return undefined;
}
