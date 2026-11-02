// Plafond de budget & comptage des sièges (facturation à l'usage, sans Stripe).
// Deux règles distinctes selon la formule :
//   - FREE : sièges bornés par la formule (PLAN_DEFS.FREE.members).
//   - Payant : sièges bornés par le PLAFOND DE BUDGET fixé par l'admin
//     (budgetCapCents / prix unitaire). Plafond non défini → aucun ajout.
// Tout est lu depuis PLAN_DEFS (source unique) ; rien n'est recopié.

import { PLAN_DEFS, formatPrice, type WorkspacePlan } from "@/lib/plans";

export function unitPriceCents(plan: WorkspacePlan): number {
  return PLAN_DEFS[plan].priceCentsPerUser;
}

export function isPaidPlan(plan: WorkspacePlan): boolean {
  return PLAN_DEFS[plan].priceCentsPerUser > 0;
}

// Nombre de sièges autorisés pour un espace.
// FREE : la limite de la formule. Payant : plafond / prix unitaire ; si le
// plafond n'est pas défini, 0 (aucun membre ne peut être ajouté).
export function maxSeats(plan: WorkspacePlan, budgetCapCents: number | null): number {
  const def = PLAN_DEFS[plan];
  if (def.priceCentsPerUser === 0) return def.members;
  if (budgetCapCents == null) return 0;
  return Math.floor(budgetCapCents / def.priceCentsPerUser);
}

// Coût mensuel estimé pour un nombre de sièges actifs donné (centimes).
export function monthlyImpactCents(plan: WorkspacePlan, seats: number): number {
  return seats * PLAN_DEFS[plan].priceCentsPerUser;
}

export function formatMonthlyImpact(plan: WorkspacePlan, seats: number): string {
  return formatPrice(monthlyImpactCents(plan, seats));
}

// Clé d'erreur i18n si porter le nombre de sièges actifs à `target` n'est pas
// permis, sinon null. `target` = total de sièges actifs visé (y compris le
// nouveau). Les clés existent sous t.errors.*.
export type SeatIssue = "budgetCapUnset" | "seatLimitReached";

export function seatCheck(
  plan: WorkspacePlan,
  budgetCapCents: number | null,
  target: number,
): SeatIssue | null {
  const def = PLAN_DEFS[plan];
  if (def.priceCentsPerUser > 0 && budgetCapCents == null) return "budgetCapUnset";
  if (target > maxSeats(plan, budgetCapCents)) return "seatLimitReached";
  return null;
}
