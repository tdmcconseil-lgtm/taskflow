"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/dal";
import { ensureAdmin } from "@/lib/auth/guards";
import { seatCheck, isPaidPlan } from "@/lib/billing/budget";
import { type WorkspacePlan } from "@/lib/plans";
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

// Change la formule et/ou le plafond de budget (réservé aux administrateurs).
//
// Facturation à l'usage, cycle ancré (cf. lib/billing/cycle) :
//   - un CHANGEMENT D'OFFRE n'est jamais appliqué tout de suite. Il est mis en
//     attente (pendingPlan + pendingBudgetCapCents) et devient effectif au
//     traitement de nuit ; l'UI affiche « pris en compte cette nuit ». Choisir
//     à nouveau l'offre courante annule le changement en attente (aller-retour).
//   - un simple AJUSTEMENT DU PLAFOND (même offre) reste immédiat : c'est un
//     garde-fou de sièges, pas un changement d'offre facturable.
// Dans tous les cas, les membres actifs doivent tenir dans les sièges autorisés
// par (offre visée, plafond visé) : sinon on bloque et on renvoie sur l'onglet
// Formule avec un message (annuler ou augmenter le plafond).
const planBudgetSchema = z.object({
  workspaceId: z.string().min(1),
  plan: z.enum(["FREE", "PRO", "BUSINESS"]),
  budgetEuros: z.coerce.number().min(0).max(1_000_000).optional(),
});

// Centimes du plafond pour une offre (null sur FREE ou si non renseigné).
function capFor(plan: WorkspacePlan, budgetEuros: number | undefined): number | null {
  if (!isPaidPlan(plan)) return null;
  return budgetEuros == null ? null : Math.round(budgetEuros * 100);
}

export async function setPlanAndBudget(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = planBudgetSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    plan: formData.get("plan"),
    budgetEuros: formData.get("budgetEuros") || undefined,
  });
  if (!parsed.success) return;

  const { workspaceId, plan, budgetEuros } = parsed.data;
  if (await ensureAdmin(user.id, workspaceId)) return;

  const budgetCapCents = capFor(plan, budgetEuros);
  const [activeMembers, workspace] = await Promise.all([
    prisma.membership.count({ where: { workspaceId, deactivatedAt: null } }),
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } }),
  ]);

  const issue = seatCheck(plan, budgetCapCents, activeMembers);
  if (issue) {
    // On renvoie aussi le montant tenté (triedBudget) pour que le formulaire se
    // rouvre sur ce que l'utilisateur venait de saisir — et non la valeur en
    // base — afin que l'alerte porte bien sur ce qu'il s'apprête à valider.
    const tb = budgetEuros == null ? "" : `&triedBudget=${budgetEuros}`;
    redirect(`/app/workspaces/${workspaceId}/administration?planError=${issue}&tried=${plan}${tb}`);
  }

  const base = `/app/workspaces/${workspaceId}/administration`;
  const currentPlan = workspace?.plan ?? "FREE";

  if (plan === currentPlan) {
    // Même offre : simple ajustement du plafond, immédiat. On vide aussi tout
    // changement en attente (cas de l'aller-retour, qui redevient un non-événement).
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { budgetCapCents, pendingPlan: null, pendingBudgetCapCents: null },
    });
    revalidatePath(base);
    redirect(base);
  }

  // Changement d'offre : mis en attente, effectif au prochain traitement de nuit.
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { pendingPlan: plan, pendingBudgetCapCents: budgetCapCents },
  });
  revalidatePath(base);
  redirect(`${base}?planPending=1`);
}
