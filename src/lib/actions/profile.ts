"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateInvitationToken, hashToken } from "@/lib/auth/tokens";
import { sendMail, emailChangeEmail } from "@/lib/mail";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { composeName } from "@/lib/name";

export type FormState = { error?: string } | undefined;

const nameSchema = z.object({
  firstName: z.string().trim().min(2, "Le prénom doit faire au moins 2 caractères."),
  lastName: z.string().trim().optional().default(""),
});

export async function updateProfileName(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = nameSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      name: composeName(parsed.data.firstName, parsed.data.lastName),
    },
  });
  revalidatePath("/app", "layout");
  redirect("/app/profile?saved=1");
}

export type PhotoFormState = { error?: string; ok?: boolean } | undefined;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 Mo (l'image est réduite côté client)

function clampInt(v: FormDataEntryValue | null, min: number, max: number, dflt: number) {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (Number.isNaN(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

// Enregistre la photo et/ou son cadrage (point focal + zoom, non destructif).
//  - « removePhoto » : efface la photo.
//  - fichier fourni : remplace la photo (+ applique le cadrage).
//  - sinon : met à jour uniquement le cadrage, sans re-téléverser.
export async function savePhoto(
  _prev: PhotoFormState,
  formData: FormData,
): Promise<PhotoFormState> {
  const user = await requireUser();

  if (formData.get("removePhoto") !== null) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        photoData: null,
        photoMime: null,
        photoX: 50,
        photoY: 50,
        photoZoom: 100,
        photoUpdatedAt: new Date(),
      },
    });
    revalidatePath("/app", "layout");
    revalidatePath("/app/profile");
    return { ok: true };
  }

  const x = clampInt(formData.get("x"), 0, 100, 50);
  const y = clampInt(formData.get("y"), 0, 100, 50);
  const zoom = clampInt(formData.get("zoom"), 100, 300, 100);

  const file = formData.get("photo");
  const hasFile = file instanceof File && file.size > 0;

  if (hasFile) {
    if (!ALLOWED_MIME.has(file.type)) {
      return { error: "Format non supporté (JPEG, PNG ou WebP)." };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { error: "Image trop lourde (2 Mo maximum)." };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    await prisma.user.update({
      where: { id: user.id },
      data: {
        photoData: buffer,
        photoMime: file.type,
        photoX: x,
        photoY: y,
        photoZoom: zoom,
        photoUpdatedAt: new Date(),
      },
    });
  } else {
    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { photoMime: true },
    });
    if (!existing?.photoMime) {
      return { error: "Aucune photo à recadrer. Choisissez d'abord une image." };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { photoX: x, photoY: y, photoZoom: zoom, photoUpdatedAt: new Date() },
    });
  }

  revalidatePath("/app", "layout");
  revalidatePath("/app/profile");
  return { ok: true };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Mot de passe actuel requis."),
    password: z.string().min(8, "Le nouveau mot de passe doit faire au moins 8 caractères."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirm"],
  });

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessionUser = await requireUser();
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) return { error: "Utilisateur introuvable." };

  const ok = await verifyPassword(user.passwordHash, parsed.data.current);
  if (!ok) return { error: "Mot de passe actuel incorrect." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  redirect("/app/profile?pwChanged=1");
}

const emailSchema = z.object({
  newEmail: z.email("Adresse email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

export async function requestEmailChange(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessionUser = await requireUser();
  const parsed = emailSchema.safeParse({
    newEmail: String(formData.get("newEmail") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) return { error: "Utilisateur introuvable." };

  if (parsed.data.newEmail === user.email) {
    return { error: "C'est déjà votre adresse actuelle." };
  }
  const ok = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!ok) return { error: "Mot de passe incorrect." };

  const taken = await prisma.user.findUnique({ where: { email: parsed.data.newEmail } });
  if (taken) return { error: "Cette adresse email est déjà utilisée." };

  const token = generateInvitationToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

  await prisma.$transaction([
    prisma.emailChangeRequest.deleteMany({ where: { userId: user.id } }),
    prisma.emailChangeRequest.create({
      data: { userId: user.id, newEmail: parsed.data.newEmail, tokenHash, expiresAt },
    }),
  ]);

  const appUrl = process.env.APP_URL ?? "http://localhost:3001";
  const t = await getDictionary();
  const locale = await getLocale();
  const mail = emailChangeEmail(
    {
      name: user.name,
      newEmail: parsed.data.newEmail,
      confirmUrl: `${appUrl}/profile/confirm-email/${token}`,
      expiresAt,
    },
    t,
    locale,
  );
  await sendMail({ to: parsed.data.newEmail, subject: mail.subject, body: mail.body });

  redirect("/app/profile?emailSent=1");
}

export async function confirmEmailChange(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: "Lien invalide." };

  const request = await prisma.emailChangeRequest.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!request) return { error: "Lien invalide ou déjà utilisé." };
  if (request.expiresAt.getTime() < Date.now()) {
    return { error: "Ce lien a expiré." };
  }

  const taken = await prisma.user.findUnique({ where: { email: request.newEmail } });
  if (taken && taken.id !== request.userId) {
    return { error: "Cette adresse email est désormais utilisée par un autre compte." };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: request.userId }, data: { email: request.newEmail } }),
    prisma.emailChangeRequest.deleteMany({ where: { userId: request.userId } }),
  ]);

  revalidatePath("/app", "layout");
  redirect("/app/profile?emailChanged=1");
}
