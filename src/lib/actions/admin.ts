"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/dal";
import { ensureAdmin } from "@/lib/auth/guards";
import { seatCheck, isPaidPlan } from "@/lib/billing/budget";
import { getDictionary, zodError } from "@/lib/i18n/server";

// État de formulaire du volet Identité : erreur localisée, ou succès.
export type AdminFormState = { error?: string; ok?: boolean } | undefined;

// Champs texte uniquement (le logo est prévu pour une itération ultérieure).
// Les champs vides sont normalisés en null ; le SIRET, s'il est renseigné, doit
// comporter 14 chiffres ; l'email de contact, s'il est renseigné, être valide.
const profileSchema = z.object({
  workspaceId: z.string().min(1),
  legalName: z.string().trim().min(2, "legalNameMin"),
  siret: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => v === "" || /^\d{14}$/.test(v), "siretInvalid"),
  vatNumber: z.string().trim(),
  addressLine1: z.string().trim(),
  postalCode: z.string().trim(),
  city: z.string().trim(),
  country: z.string().trim(),
  contactEmail: z
    .string()
    .trim()
    .refine((v) => v === "" || z.email().safeParse(v).success, "emailInvalid"),
  phone: z.string().trim(),
});

// Vide → null, pour ne pas stocker de chaînes vides en base.
const orNull = (v: string) => (v === "" ? null : v);

export async function updateOrganizationProfile(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await requireUser();
  const t = await getDictionary();

  const parsed = profileSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    legalName: formData.get("legalName") ?? "",
    siret: formData.get("siret") ?? "",
    vatNumber: formData.get("vatNumber") ?? "",
    addressLine1: formData.get("addressLine1") ?? "",
    postalCode: formData.get("postalCode") ?? "",
    city: formData.get("city") ?? "",
    country: formData.get("country") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return { error: zodError(t, parsed.error.issues[0]?.message) };
  }

  const { workspaceId, legalName } = parsed.data;
  const adminError = await ensureAdmin(user.id, workspaceId);
  if (adminError) return { error: adminError };

  const data = {
    legalName,
    siret: orNull(parsed.data.siret),
    vatNumber: orNull(parsed.data.vatNumber),
    addressLine1: orNull(parsed.data.addressLine1),
    postalCode: orNull(parsed.data.postalCode),
    city: orNull(parsed.data.city),
    country: parsed.data.country === "" ? "France" : parsed.data.country,
    contactEmail: orNull(parsed.data.contactEmail),
    phone: orNull(parsed.data.phone),
  };

  await prisma.organizationProfile.upsert({
    where: { workspaceId },
    create: { workspaceId, ...data },
    update: data,
  });

  revalidatePath(`/app/workspaces/${workspaceId}/administration`);
  return { ok: true };
}

// Change la formule de l'espace (version pré-Stripe : bascule directe du champ
// `plan`, réservée aux administrateurs). Après Stripe, le changement passera par
// le paiement (Checkout / Billing Portal).
const planSchema = z.object({
  workspaceId: z.string().min(1),
  plan: z.enum(["FREE", "PRO", "BUSINESS"]),
});

export async function setWorkspacePlan(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = planSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    plan: formData.get("plan"),
  });
  if (!parsed.success) return;

  const { workspaceId, plan } = parsed.data;
  if (await ensureAdmin(user.id, workspaceId)) return;

  // Vers une offre payante : les membres actifs doivent tenir sous le plafond de
  // budget défini. Sinon on bloque et on invite à définir / relever le plafond
  // d'abord (l'erreur est portée par ?planError, affichée dans l'onglet Formule).
  if (isPaidPlan(plan)) {
    const [ws, activeMembers] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspaceId }, select: { budgetCapCents: true } }),
      prisma.membership.count({ where: { workspaceId, deactivatedAt: null } }),
    ]);
    const issue = seatCheck(plan, ws?.budgetCapCents ?? null, activeMembers);
    if (issue) {
      redirect(`/app/workspaces/${workspaceId}/administration?planError=${issue}&tried=${plan}`);
    }
  }

  await prisma.workspace.update({ where: { id: workspaceId }, data: { plan } });
  revalidatePath(`/app/workspaces/${workspaceId}/administration`);
  redirect(`/app/workspaces/${workspaceId}/administration`);
}

// Fixe le plafond de budget mensuel (en euros, converti en centimes) sur une
// offre payante. Réservé aux administrateurs. Tant qu'il n'est pas défini,
// aucun membre ne peut être ajouté (cf. lib/billing/budget).
const budgetSchema = z.object({
  workspaceId: z.string().min(1),
  budgetEuros: z.coerce.number().min(0).max(1_000_000),
});

export async function setBudgetCap(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = budgetSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    budgetEuros: formData.get("budgetEuros"),
  });
  if (!parsed.success) return;

  const { workspaceId, budgetEuros } = parsed.data;
  if (await ensureAdmin(user.id, workspaceId)) return;

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { budgetCapCents: Math.round(budgetEuros * 100) },
  });
  revalidatePath(`/app/workspaces/${workspaceId}/administration`);
}
