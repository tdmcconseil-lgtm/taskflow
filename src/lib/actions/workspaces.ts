"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership } from "@/lib/auth/dal";

export type FormState = { error?: string } | undefined;

const workspaceSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit faire au moins 2 caractères."),
});

export async function createWorkspace(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = workspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  revalidatePath("/app");
  redirect("/app");
}

const addMemberSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.email("Adresse email invalide."),
});

export async function addMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = addMemberSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  // L'utilisateur courant doit être membre du workspace pour y inviter quelqu'un.
  const membership = await getMembership(user.id, parsed.data.workspaceId);
  if (!membership) {
    return { error: "Vous n'avez pas accès à cet espace de travail." };
  }

  const invitee = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!invitee) {
    return {
      error: "Aucun utilisateur avec cet email. La personne doit d'abord créer un compte.",
    };
  }

  const already = await getMembership(invitee.id, parsed.data.workspaceId);
  if (already) {
    return { error: "Cette personne est déjà membre de l'espace." };
  }

  await prisma.membership.create({
    data: { userId: invitee.id, workspaceId: parsed.data.workspaceId, role: "MEMBER" },
  });

  revalidatePath(`/app/workspaces/${parsed.data.workspaceId}/members`);
  redirect(`/app/workspaces/${parsed.data.workspaceId}/members`);
}
