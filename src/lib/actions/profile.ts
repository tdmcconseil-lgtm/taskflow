"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateInvitationToken, hashToken } from "@/lib/auth/tokens";
import { sendMail, emailChangeEmail } from "@/lib/mail";
import { getDictionary, getLocale, zodError } from "@/lib/i18n/server";
import { composeName } from "@/lib/name";

export type FormState = { error?: string } | undefined;

const nameSchema = z.object({
  firstName: z.string().trim().min(2, "firstNameMin"),
  lastName: z.string().trim().optional().default(""),
});

export async function updateProfileName(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const t = await getDictionary();
  const parsed = nameSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || "",
  });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
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
  const t = await getDictionary();

  const file = formData.get("photo");
  const hasFile = file instanceof File && file.size > 0;

  if (hasFile) {
    if (!ALLOWED_MIME.has(file.type)) {
      return { error: t.errors.imageFormat };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { error: t.errors.imageTooLarge };
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
      return { error: t.errors.noPhotoToCrop };
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
    current: z.string().min(1, "currentPasswordRequired"),
    password: z.string().min(8, "newPasswordMin8"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "passwordsMismatch",
    path: ["confirm"],
  });

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessionUser = await requireUser();
  const t = await getDictionary();
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) return { error: t.errors.userNotFound };

  const ok = await verifyPassword(user.passwordHash, parsed.data.current);
  if (!ok) return { error: t.errors.currentPasswordIncorrect };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  redirect("/app/profile?pwChanged=1");
}

const emailSchema = z.object({
  newEmail: z.email("emailInvalid"),
  password: z.string().min(1, "passwordRequired"),
});

export async function requestEmailChange(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessionUser = await requireUser();
  const t = await getDictionary();
  const parsed = emailSchema.safeParse({
    newEmail: String(formData.get("newEmail") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) return { error: t.errors.userNotFound };

  if (parsed.data.newEmail === user.email) {
    return { error: t.errors.sameEmail };
  }
  const ok = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!ok) return { error: t.errors.passwordIncorrect };

  const taken = await prisma.user.findUnique({ where: { email: parsed.data.newEmail } });
  if (taken) return { error: t.errors.emailTaken };

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
  const t = await getDictionary();
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: t.errors.linkInvalid };

  const request = await prisma.emailChangeRequest.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!request) return { error: t.errors.linkInvalidOrUsed };
  if (request.expiresAt.getTime() < Date.now()) {
    return { error: t.errors.linkExpired };
  }

  const taken = await prisma.user.findUnique({ where: { email: request.newEmail } });
  if (taken && taken.id !== request.userId) {
    return { error: t.errors.emailNowUsed };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: request.userId }, data: { email: request.newEmail } }),
    prisma.emailChangeRequest.deleteMany({ where: { userId: request.userId } }),
  ]);

  revalidatePath("/app", "layout");
  redirect("/app/profile?emailChanged=1");
}
