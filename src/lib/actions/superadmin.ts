"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { IdeaStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth/superadmin-guard";
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
