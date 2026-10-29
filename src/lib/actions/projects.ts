"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership } from "@/lib/auth/dal";

export type FormState = { error?: string } | undefined;

const projectSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(2, "Le nom doit faire au moins 2 caractères."),
  description: z.string().trim().max(2000).optional(),
});

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = projectSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const membership = await getMembership(user.id, parsed.data.workspaceId);
  if (!membership) {
    return { error: "Vous n'avez pas accès à cet espace de travail." };
  }

  await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      workspaceId: parsed.data.workspaceId,
      createdById: user.id,
    },
  });

  revalidatePath(`/app/workspaces/${parsed.data.workspaceId}`);
  redirect(`/app/workspaces/${parsed.data.workspaceId}`);
}
