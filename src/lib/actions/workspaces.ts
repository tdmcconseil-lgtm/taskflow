"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { generateInvitationToken, hashToken } from "@/lib/auth/tokens";
import { sendMail, invitationEmail } from "@/lib/mail";
import { composeName } from "@/lib/name";

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

// Seul le propriétaire peut archiver/supprimer un espace. Renvoie l'erreur
// éventuelle, ou null si l'utilisateur est bien OWNER.
async function ensureOwner(userId: string, workspaceId: string): Promise<string | null> {
  const membership = await getMembership(userId, workspaceId);
  if (!membership) return "Vous n'avez pas accès à cet espace de travail.";
  if (membership.role !== "OWNER") {
    return "Seul le propriétaire peut effectuer cette action.";
  }
  return null;
}

export async function archiveWorkspace(formData: FormData): Promise<void> {
  const user = await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  if (!workspaceId) return;
  if (await ensureOwner(user.id, workspaceId)) return;

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/app");
  redirect(`/app/workspaces/${workspaceId}`);
}

export async function unarchiveWorkspace(formData: FormData): Promise<void> {
  const user = await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  if (!workspaceId) return;
  if (await ensureOwner(user.id, workspaceId)) return;

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { archivedAt: null },
  });
  revalidatePath("/app");
  redirect(`/app/workspaces/${workspaceId}`);
}

const deleteSchema = z.object({
  workspaceId: z.string().min(1),
  confirmName: z.string(),
});

export async function deleteWorkspace(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = deleteSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    confirmName: formData.get("confirmName"),
  });
  if (!parsed.success) return { error: "Données invalides." };

  const ownerError = await ensureOwner(user.id, parsed.data.workspaceId);
  if (ownerError) return { error: ownerError };

  const workspace = await prisma.workspace.findUnique({
    where: { id: parsed.data.workspaceId },
    select: { name: true, archivedAt: true },
  });
  if (!workspace) return { error: "Espace de travail introuvable." };

  // Garde-fou : la suppression n'est possible que sur un espace archivé.
  if (!workspace.archivedAt) {
    return { error: "Archivez d'abord l'espace avant de le supprimer." };
  }

  // Confirmation forte : le nom saisi doit correspondre exactement.
  if (parsed.data.confirmName.trim() !== workspace.name) {
    return { error: "Le nom saisi ne correspond pas. Suppression annulée." };
  }

  // La suppression en cascade retire projets, tâches, membres et invitations.
  await prisma.workspace.delete({ where: { id: parsed.data.workspaceId } });

  revalidatePath("/app");
  redirect("/app");
}

const inviteSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.email("Adresse email invalide."),
});

export async function inviteMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = inviteSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const { workspaceId, email } = parsed.data;

  // L'utilisateur courant doit être membre du workspace pour y inviter.
  const membership = await getMembership(user.id, workspaceId);
  if (!membership) {
    return { error: "Vous n'avez pas accès à cet espace de travail." };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });
  if (!workspace) return { error: "Espace de travail introuvable." };

  // Si la personne a déjà un compte, on l'ajoute directement.
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const already = await getMembership(existingUser.id, workspaceId);
    if (already) return { error: "Cette personne est déjà membre de l'espace." };

    await prisma.membership.create({
      data: { userId: existingUser.id, workspaceId, role: "MEMBER" },
    });
    revalidatePath(`/app/workspaces/${workspaceId}/members`);
    redirect(`/app/workspaces/${workspaceId}/members`);
  }

  // Sinon, on crée (ou on renouvelle) une invitation et on envoie l'email.
  const token = generateInvitationToken();
  const tokenHash = hashToken(token);
  const ttlDays = Number.parseInt(process.env.INVITATION_TTL_DAYS ?? "7", 10);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    // Supprime une éventuelle invitation en attente pour le même email/workspace.
    prisma.invitation.deleteMany({
      where: { email, workspaceId, acceptedAt: null },
    }),
    prisma.invitation.create({
      data: { email, tokenHash, workspaceId, invitedById: user.id, expiresAt },
    }),
  ]);

  const appUrl = process.env.APP_URL ?? "http://localhost:3001";
  const mail = invitationEmail({
    inviterName: user.name,
    workspaceName: workspace.name,
    acceptUrl: `${appUrl}/invitations/${token}`,
    expiresAt,
  });
  await sendMail({ to: email, subject: mail.subject, body: mail.body });

  revalidatePath(`/app/workspaces/${workspaceId}/members`);
  redirect(`/app/workspaces/${workspaceId}/members`);
}

export async function cancelInvitation(formData: FormData): Promise<void> {
  const user = await requireUser();
  const invitationId = String(formData.get("invitationId") ?? "");
  if (!invitationId) return;

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { id: true, workspaceId: true, acceptedAt: true },
  });
  if (!invitation || invitation.acceptedAt) return;

  const membership = await getMembership(user.id, invitation.workspaceId);
  if (!membership) return;

  await prisma.invitation.delete({ where: { id: invitation.id } });
  revalidatePath(`/app/workspaces/${invitation.workspaceId}/members`);
}

const acceptSchema = z
  .object({
    token: z.string().min(1),
    firstName: z.string().trim().min(2, "Le prénom doit faire au moins 2 caractères."),
    lastName: z.string().trim().optional().default(""),
    password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirm"],
  });

export async function acceptInvitation(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = acceptSchema.safeParse({
    token: formData.get("token"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || "",
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const tokenHash = hashToken(parsed.data.token);
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash } });

  if (!invitation || invitation.acceptedAt) {
    return { error: "Invitation invalide ou déjà utilisée." };
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    return { error: "Cette invitation a expiré." };
  }

  // Cas limite : un compte avec cet email a été créé entre-temps.
  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });
  if (existingUser) {
    const already = await getMembership(existingUser.id, invitation.workspaceId);
    await prisma.$transaction([
      ...(already
        ? []
        : [
            prisma.membership.create({
              data: {
                userId: existingUser.id,
                workspaceId: invitation.workspaceId,
                role: invitation.role,
              },
            }),
          ]),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);
    redirect("/login");
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const newUser = await prisma.user.create({
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      name: composeName(parsed.data.firstName, parsed.data.lastName),
      email: invitation.email,
      passwordHash,
      memberships: {
        create: { workspaceId: invitation.workspaceId, role: invitation.role },
      },
    },
  });

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  });

  await createSession({ userId: newUser.id });
  redirect("/app");
}
