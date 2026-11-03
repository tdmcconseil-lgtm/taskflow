"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/dal";
import { getDictionary, zodError } from "@/lib/i18n/server";

export type FormState = { error?: string } | undefined;

// Pseudo affiché dans le module Idées : court, sans espaces superflus.
const pseudoSchema = z
  .string()
  .trim()
  .min(2, "pseudoRequired")
  .max(30, "pseudoTooLong");

const createSchema = z.object({
  title: z.string().trim().min(1, "titleRequired").max(200),
  body: z.string().trim().max(5000).optional(),
  // Pseudo fourni uniquement si l'utilisateur n'en a pas encore.
  pseudo: z.string().trim().optional(),
});

// Crée une idée. Si l'utilisateur n'a pas encore de pseudo, le champ `pseudo`
// du formulaire est requis et devient son pseudo persistant. Le pseudo est
// recopié sur l'idée (figé) pour rester stable si l'auteur le change ensuite.
export async function createIdea(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const t = await getDictionary();

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    pseudo: formData.get("pseudo") || undefined,
  });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
  }

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { pseudo: true },
  });

  let pseudo = existing?.pseudo ?? null;
  if (!pseudo) {
    // Pas de pseudo en base : il doit être saisi lors de cette première idée.
    const p = pseudoSchema.safeParse(parsed.data.pseudo ?? "");
    if (!p.success) {
      return { error: zodError(t, p.error.issues[0]?.message) };
    }
    pseudo = p.data;
    await prisma.user.update({ where: { id: user.id }, data: { pseudo } });
  }

  await prisma.idea.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body ?? null,
      pseudo,
      authorId: user.id,
    },
  });

  revalidatePath("/app/idees");
  redirect("/app/idees");
}

// Bascule le pouce de l'utilisateur courant sur une idée : la ligne IdeaVote
// est créée si elle n'existe pas, supprimée sinon. La contrainte d'unicité
// (ideaId, userId) garantit un seul pouce par personne.
export async function toggleIdeaVote(formData: FormData): Promise<void> {
  const user = await requireUser();
  const ideaId = String(formData.get("ideaId") ?? "");
  if (!ideaId) return;

  // L'idée doit exister (sinon rien à voter).
  const idea = await prisma.idea.findUnique({ where: { id: ideaId }, select: { id: true } });
  if (!idea) return;

  const existing = await prisma.ideaVote.findUnique({
    where: { ideaId_userId: { ideaId, userId: user.id } },
  });
  if (existing) {
    await prisma.ideaVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.ideaVote.create({ data: { ideaId, userId: user.id } });
  }

  revalidatePath("/app/idees");
}

// Supprime une idée. Réservé à son auteur (la modération par un admin viendra
// plus tard). Les pouces associés partent en cascade.
export async function deleteIdea(formData: FormData): Promise<void> {
  const user = await requireUser();
  const ideaId = String(formData.get("ideaId") ?? "");
  if (!ideaId) return;

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { authorId: true },
  });
  if (!idea || idea.authorId !== user.id) return;

  await prisma.idea.delete({ where: { id: ideaId } });
  revalidatePath("/app/idees");
}

// Met à jour le pseudo de l'utilisateur (depuis le profil). Même pseudo réutilisé
// sur toutes ses futures idées ; les idées déjà postées gardent l'ancien (figé).
export async function setPseudo(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const t = await getDictionary();

  const parsed = pseudoSchema.safeParse(formData.get("pseudo") ?? "");
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
  }

  await prisma.user.update({ where: { id: user.id }, data: { pseudo: parsed.data } });
  revalidatePath("/app/idees");
  redirect("/app/profile?saved=1");
}
