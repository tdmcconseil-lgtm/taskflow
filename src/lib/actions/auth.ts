"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { composeName } from "@/lib/name";

export type FormState = { error?: string } | undefined;

const signupSchema = z.object({
  firstName: z.string().trim().min(2, "Le prénom doit faire au moins 2 caractères."),
  lastName: z.string().trim().optional().default(""),
  email: z.email("Adresse email invalide."),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères."),
});

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || "",
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const { firstName, lastName, email, password } = parsed.data;
  const name = composeName(firstName, lastName);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cette adresse email." };
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
  email: z.email("Adresse email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Message générique — ne pas révéler si l'email existe.
  const genericError = { error: "Identifiants invalides." };
  if (!user) return genericError;

  const ok = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!ok) return genericError;

  await createSession({ userId: user.id });
  redirect("/app");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
