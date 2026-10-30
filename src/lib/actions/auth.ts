"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { composeName } from "@/lib/name";
import { cookies } from "next/headers";
import { locales, LOCALE_COOKIE } from "@/lib/i18n/config";
import { getDictionary, zodError } from "@/lib/i18n/server";

export type FormState = { error?: string } | undefined;

const signupSchema = z.object({
  firstName: z.string().trim().min(2, "firstNameMin"),
  lastName: z.string().trim().optional().default(""),
  email: z.email("emailInvalid"),
  password: z.string().min(8, "passwordMin8"),
});

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const parsed = signupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || "",
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
  }

  const { firstName, lastName, email, password } = parsed.data;
  const name = composeName(firstName, lastName);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: t.errors.accountExists };
  }

  const passwordHash = await hashPassword(password);

  // L'utilisateur est créé avec son propre espace de travail (dont il est OWNER).
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      name,
      email,
      passwordHash,
      memberships: {
        create: {
          role: "OWNER",
          workspace: { create: { name: `Espace de ${firstName}` } },
        },
      },
    },
  });

  await createSession({ userId: user.id });
  redirect("/app");
}

const loginSchema = z.object({
  email: z.email("emailInvalid"),
  password: z.string().min(1, "passwordRequired"),
});

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Message générique — ne pas révéler si l'email existe.
  const genericError = { error: t.errors.invalidCredentials };
  if (!user) return genericError;

  const ok = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!ok) return genericError;

  // Appliquer la langue préférée du compte (si définie) à cette session.
  if (user.locale && (locales as readonly string[]).includes(user.locale)) {
    (await cookies()).set(LOCALE_COOKIE, user.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  await createSession({ userId: user.id });
  redirect("/app");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
