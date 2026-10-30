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
import { getDictionary, getLocale, zodError } from "@/lib/i18n/server";
import { composeName } from "@/lib/name";

export type FormState = { error?: string } | undefined;

const workspaceSchema = z.object({
  name: z.string().trim().min(2, "nameMin2"),
});

export async function createWorkspace(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const t = await getDictionary();
  const parsed = workspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
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
  if (!membership) return (await getDictionary()).errors.noWorkspaceAccess;
  if (membership.role !== "OWNER") {
    return (await getDictionary()).errors.ownerOnly;
  }
  return null;
}

// Administrateur = créateur (OWNER) ou administrateur (ADMIN).
async function ensureAdmin(userId: string, workspaceId: string): Promise<string | null> {
  const membership = await getMembership(userId, workspaceId);
  if (!membership) return (await getDictionary()).errors.noWorkspaceAccess;
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    return (await getDictionary()).errors.adminOnly;
  }
  return null;
}

// Change le rôle d'un membre (admin uniquement ; le créateur n'est pas modifiable).
export async function setMemberRole(
  workspaceId: string,
  targetUserId: string,
  role: "ADMIN" | "MEMBER",
): Promise<void> {
  const user = await requireUser();
  if (await ensureAdmin(user.id, workspaceId)) return;

  const target = await prisma.membership.findFirst({
    where: { userId: targetUserId, workspaceId },
  });
  if (!target || target.role === "OWNER") return;

  await prisma.membership.update({ where: { id: target.id }, data: { role } });
  revalidatePath(`/app/workspaces/${workspaceId}`);
}

// Active / désactive un membre (admin uniquement ; ni soi-même, ni le créateur).
export async function setMemberActive(
  workspaceId: string,
  targetUserId: string,
  active: boolean,
): Promise<void> {
  const user = await requireUser();
  if (await ensureAdmin(user.id, workspaceId)) return;
  if (targetUserId === user.id) return;

  const target = await prisma.membership.findFirst({
    where: { userId: targetUserId, workspaceId },
  });
  if (!target || target.role === "OWNER") return;

  await prisma.membership.update({
    where: { id: target.id },
    data: { deactivatedAt: active ? null : new Date() },
  });
  revalidatePath(`/app/workspaces/${workspaceId}`);
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
  const t = await getDictionary();
  const parsed = deleteSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    confirmName: formData.get("confirmName"),
  });
  if (!parsed.success) return { error: t.errors.invalidData };

  const ownerError = await ensureOwner(user.id, parsed.data.workspaceId);
  if (ownerError) return { error: ownerError };

  const workspace = await prisma.workspace.findUnique({
    where: { id: parsed.data.workspaceId },
    select: { name: true, archivedAt: true },
  });
  if (!workspace) return { error: t.errors.workspaceNotFound };

  // Garde-fou : la suppression n'est possible que sur un espace archivé.
  if (!workspace.archivedAt) {
    return { error: t.errors.archiveFirst };
  }

  // Confirmation forte : le nom saisi doit correspondre exactement.
  if (parsed.data.confirmName.trim() !== workspace.name) {
    return { error: t.errors.nameMismatch };
  }

  // La suppression en cascade retire projets, tâches, membres et invitations.
  await prisma.workspace.delete({ where: { id: parsed.data.workspaceId } });

  revalidatePath("/app");
  redirect("/app");
}

const inviteSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.email("emailInvalid"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export async function inviteMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const t = await getDictionary();
  const parsed = inviteSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: formData.get("role") || undefined,
  });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
  }

  const { workspaceId, email, role } = parsed.data;

  // Seul un administrateur peut inviter.
  const adminError = await ensureAdmin(user.id, workspaceId);
  if (adminError) return { error: adminError };

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });
  if (!workspace) return { error: t.errors.workspaceNotFound };

  // Si la personne a déjà un compte, on l'ajoute directement.
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const already = await getMembership(existingUser.id, workspaceId);
    if (already) return { error: t.errors.alreadyMember };

    await prisma.membership.create({
      data: { userId: existingUser.id, workspaceId, role },
    });
    revalidatePath(`/app/workspaces/${workspaceId}`);
    redirect(`/app/workspaces/${workspaceId}?tab=membres`);
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
      data: { email, tokenHash, workspaceId, invitedById: user.id, expiresAt, role },
    }),
  ]);

  const appUrl = process.env.APP_URL ?? "http://localhost:3001";
  const locale = await getLocale();
  const mail = invitationEmail(
    {
      inviterName: user.name,
      workspaceName: workspace.name,
      acceptUrl: `${appUrl}/invitations/${token}`,
      expiresAt,
    },
    t,
    locale,
  );
  await sendMail({ to: email, subject: mail.subject, body: mail.body });

  revalidatePath(`/app/workspaces/${workspaceId}`);
  redirect(`/app/workspaces/${workspaceId}?sent=${encodeURIComponent(email)}`);
}

// Renvoie l'email d'invitation (admin uniquement). Un nouveau jeton et une
// nouvelle échéance sont générés : l'ancien lien devient caduc. Redirige vers la
// liste avec un indicateur de confirmation.
export async function resendInvitation(formData: FormData): Promise<void> {
  const user = await requireUser();
  const invitationId = String(formData.get("invitationId") ?? "");
  if (!invitationId) return;

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { id: true, email: true, workspaceId: true, acceptedAt: true },
  });
  if (!invitation || invitation.acceptedAt) return;

  if (await ensureAdmin(user.id, invitation.workspaceId)) return;

  const workspace = await prisma.workspace.findUnique({
    where: { id: invitation.workspaceId },
    select: { name: true },
  });
  if (!workspace) return;

  const token = generateInvitationToken();
  const tokenHash = hashToken(token);
  const ttlDays = Number.parseInt(process.env.INVITATION_TTL_DAYS ?? "7", 10);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { tokenHash, expiresAt },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3001";
  const t = await getDictionary();
  const locale = await getLocale();
  const mail = invitationEmail(
    {
      inviterName: user.name,
      workspaceName: workspace.name,
      acceptUrl: `${appUrl}/invitations/${token}`,
      expiresAt,
    },
    t,
    locale,
  );
  await sendMail({ to: invitation.email, subject: mail.subject, body: mail.body });

  revalidatePath(`/app/workspaces/${invitation.workspaceId}`);
  redirect(
    `/app/workspaces/${invitation.workspaceId}?sent=${encodeURIComponent(invitation.email)}`,
  );
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

  if (await ensureAdmin(user.id, invitation.workspaceId)) return;

  await prisma.invitation.delete({ where: { id: invitation.id } });
  revalidatePath(`/app/workspaces/${invitation.workspaceId}`);
}

const acceptSchema = z
  .object({
    token: z.string().min(1),
    firstName: z.string().trim().min(2, "firstNameMin"),
    lastName: z.string().trim().optional().default(""),
    password: z.string().min(8, "passwordMin8"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "passwordsMismatch",
    path: ["confirm"],
  });

export async function acceptInvitation(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const parsed = acceptSchema.safeParse({
    token: formData.get("token"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || "",
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
  }

  const tokenHash = hashToken(parsed.data.token);
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash } });

  if (!invitation || invitation.acceptedAt) {
    return { error: t.errors.invitationInvalid };
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    return { error: t.errors.invitationExpired };
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
