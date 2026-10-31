"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { generateInvitationToken, hashToken } from "@/lib/auth/tokens";
import { sendMail, passwordResetEmail } from "@/lib/mail";
import { getDictionary, getLocale, zodError } from "@/lib/i18n/server";

export type FormState = { error?: string } | undefined;

// Durée de validité d'un lien de réinitialisation (1 h).
const RESET_TTL_MS = 60 * 60 * 1000;

const requestSchema = z.object({ email: z.email("emailInvalid") });

// Demande de réinitialisation : envoie un lien par email si un compte existe.
// On redirige toujours vers la confirmation, sans révéler si l'adresse existe.
export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = await getDictionary();
  const parsed = requestSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = generateInvitationToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);

    await prisma.$transaction([
      // Un seul lien actif à la fois : on invalide les précédents.
      prisma.passwordResetRequest.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetRequest.create({ data: { userId: user.id, tokenHash, expiresAt } }),
    ]);

    const appUrl = process.env.APP_URL ?? "http://localhost:3001";
    const locale = await getLocale();
    const mail = passwordResetEmail(
      { name: user.name, resetUrl: `${appUrl}/reset-password/${token}`, expiresAt },
      t,
      locale,
    );
    await sendMail({ to: user.email, subject: mail.subject, body: mail.body });
  }

  redirect("/forgot-password?sent=1");
}

const resetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "passwordMin8"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "passwordsMismatch",
    path: ["confirm"],
  });

// Réinitialise le mot de passe à partir d'un jeton valide, puis connecte
// directement l'utilisateur.
export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
  }

  const request = await prisma.passwordResetRequest.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });
  if (!request) return { error: t.errors.linkInvalidOrUsed };
  if (request.expiresAt.getTime() < Date.now()) return { error: t.errors.linkExpired };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: request.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    prisma.passwordResetRequest.deleteMany({ where: { userId: request.userId } }),
  ]);

  await createSession({ userId: request.userId });
  redirect("/app");
}
