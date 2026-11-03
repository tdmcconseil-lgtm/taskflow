// Facturation à l'usage : cycle ancré sur la date d'abonnement + prorata base 30.
//
// Le modèle « mois civil » est remplacé par un cycle anniversaire : souscrire à
// une offre payante démarre un cycle à cette date, renouvelé chaque mois. Un
// changement d'offre n'est JAMAIS appliqué tout de suite : il est mis en attente
// (Workspace.pendingPlan) et devient effectif au « traitement de nuit », qui est
// la seule chose qui fait avancer l'état de facturation (cf. runNightly).
//
// À chaque segment clôturé (changement effectif, passage à FREE, ou
// renouvellement de cycle) on écrit une ligne BillingSegment : une facture
// interne au prorata (base 30, plafonnée à un mois plein). Ces segments
// alimenteront l'encaissement réel (Stripe) plus tard — ici, rien n'est encaissé.
//
// Les fonctions de calcul (prorata, addMonth, dayCount, planNightly) sont pures
// et testables sans base ; l'exécution (comptage des utilisateurs, écriture des
// segments, persistance) est isolée dans runNightlyForWorkspace / runNightly.

import { prisma } from "@/lib/prisma";
import { isPaidPlan, unitPriceCents } from "@/lib/billing/budget";
import { billableUserCount } from "@/lib/billing/usage";
import type { WorkspacePlan } from "@/lib/plans";

const DAY_MS = 24 * 60 * 60 * 1000;

// Prorata base 30, plafonné à 1 (jamais plus d'un mois plein, même sur 31 jours).
export function prorata(days: number): number {
  return Math.min(days / 30, 1);
}

// Nombre de jours entiers entre deux instants (minuit → minuit), jamais négatif.
export function dayCount(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_MS));
}

// Montant d'un segment en centimes : utilisateurs × prix unitaire × prorata, arrondi.
export function segmentAmountCents(
  billableUsers: number,
  unitCents: number,
  days: number,
): number {
  return Math.round(billableUsers * unitCents * prorata(days));
}

// Date anniversaire : +1 mois, en calant sur le dernier jour du mois si le jour
// d'origine n'existe pas (31 janvier + 1 mois → 28/29 février). Travaille en UTC
// pour rester déterministe (les dates de cycle sont des minuits UTC).
export function addMonth(d: Date): Date {
  const day = d.getUTCDate();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, lastDay)));
}

export type BillingState = {
  plan: WorkspacePlan;
  billingCycleStart: Date | null;
  pendingPlan: WorkspacePlan | null;
};

// Un segment à clôturer (facture interne à produire).
export type SegmentToClose = { plan: WorkspacePlan; start: Date; end: Date };

export type NightlyPlan = {
  // Segments clôturés par ce traitement (0, 1, ou plusieurs si renouvellements
  // rattrapés après une interruption du job).
  segments: SegmentToClose[];
  nextPlan: WorkspacePlan;
  nextCycleStart: Date | null;
  // true = l'offre a changé → appliquer aussi le plafond en attente.
  planChanged: boolean;
};

// Décide, de façon PURE, ce que le traitement de nuit doit faire pour un espace,
// à la date `today` (minuit du jour facturé). Reproduit l'algorithme de la spec :
//   - un choix en attente différent de l'offre courante → changement effectif :
//     clôture du segment payant quitté (le cas échéant) + bascule + nouveau cycle ;
//   - sinon, sur offre payante, on clôt autant de cycles échus que nécessaire
//     (rattrapage si le job n'a pas tourné pendant plusieurs mois).
// Un choix en attente égal à l'offre courante (aller-retour) est un non-événement.
export function planNightly(state: BillingState, today: Date): NightlyPlan {
  const target = state.pendingPlan ?? state.plan;
  const segments: SegmentToClose[] = [];

  if (state.pendingPlan && target !== state.plan) {
    if (isPaidPlan(state.plan) && state.billingCycleStart) {
      segments.push({ plan: state.plan, start: state.billingCycleStart, end: today });
    }
    return {
      segments,
      nextPlan: target,
      nextCycleStart: isPaidPlan(target) ? today : null,
      planChanged: true,
    };
  }

  let cycleStart = state.billingCycleStart;
  if (isPaidPlan(state.plan) && cycleStart) {
    while (today.getTime() >= addMonth(cycleStart).getTime()) {
      const end = addMonth(cycleStart);
      segments.push({ plan: state.plan, start: cycleStart, end });
      cycleStart = end;
    }
  }
  return { segments, nextPlan: state.plan, nextCycleStart: cycleStart, planChanged: false };
}

// Les parties d'un espace nécessaires au traitement de nuit.
type WorkspaceBilling = {
  id: string;
  plan: WorkspacePlan;
  billingCycleStart: Date | null;
  pendingPlan: WorkspacePlan | null;
  pendingBudgetCapCents: number | null;
};

// Applique le traitement de nuit à UN espace, à la date `today`, dans une
// transaction : écrit les segments clôturés (montant proraté, utilisateurs
// facturés sur la période du segment) puis met à jour l'état de facturation et
// vide le choix en attente. Renvoie le nombre de segments écrits.
export async function runNightlyForWorkspace(
  ws: WorkspaceBilling,
  today: Date,
): Promise<number> {
  const plan = planNightly(
    { plan: ws.plan, billingCycleStart: ws.billingCycleStart, pendingPlan: ws.pendingPlan },
    today,
  );

  const rows = await Promise.all(
    plan.segments.map(async (seg) => {
      const users = await billableUserCount(ws.id, seg.start, seg.end);
      const unit = unitPriceCents(seg.plan);
      const days = dayCount(seg.start, seg.end);
      return {
        workspaceId: ws.id,
        plan: seg.plan,
        startedAt: seg.start,
        endedAt: seg.end,
        days,
        billableUsers: users,
        unitPriceCents: unit,
        amountCents: segmentAmountCents(users, unit, days),
      };
    }),
  );

  await prisma.$transaction(async (tx) => {
    if (rows.length > 0) await tx.billingSegment.createMany({ data: rows });
    await tx.workspace.update({
      where: { id: ws.id },
      data: {
        plan: plan.nextPlan,
        billingCycleStart: plan.nextCycleStart,
        // Le plafond en attente n'est appliqué qu'au changement d'offre effectif.
        ...(plan.planChanged ? { budgetCapCents: ws.pendingBudgetCapCents } : {}),
        pendingPlan: null,
        pendingBudgetCapCents: null,
        lastBilledOn: today,
      },
    });
  });

  return rows.length;
}

// Parties du jour civil (dans le fuseau donné) servant à décider si le traitement
// de nuit est dû et à ancrer les dates de cycle (minuit UTC du jour facturé).
function tzParts(now: Date, tz: string): { y: number; m: number; d: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  // hour12:false rend parfois 24 à minuit : on ramène à 0.
  const hour = get("hour") % 24;
  return { y: get("year"), m: get("month"), d: get("day"), hour };
}

// Minuit UTC du jour civil `now` dans le fuseau `tz` (sert d'ancre de cycle).
export function billingDay(now: Date, tz: string): Date {
  const { y, m, d } = tzParts(now, tz);
  return new Date(Date.UTC(y, m - 1, d));
}

const globalForNightly = globalThis as unknown as { billingNightlyRunning?: boolean };

// Traitement de nuit (quotidien) : pour chaque espace sur offre payante ou avec
// un choix en attente, applique l'algorithme si l'espace n'a pas déjà été traité
// aujourd'hui (garde-fou lastBilledOn). Idempotent : réexécuté le même jour, il
// ne refait rien. Heure et fuseau configurables (BILLING_NIGHTLY_HOUR, BILLING_TZ) ;
// défaut 03h00 Europe/Paris.
export async function runNightly(now: Date = new Date()): Promise<void> {
  const tz = process.env.BILLING_TZ ?? "Europe/Paris";
  const hour = Number.parseInt(process.env.BILLING_NIGHTLY_HOUR ?? "3", 10);

  const { hour: currentHour } = tzParts(now, tz);
  // On n'évalue qu'à partir de l'heure configurée (la nuit).
  if (currentHour < hour) return;

  if (globalForNightly.billingNightlyRunning) return;
  globalForNightly.billingNightlyRunning = true;
  try {
    const today = billingDay(now, tz);
    const candidates = await prisma.workspace.findMany({
      where: {
        OR: [{ plan: { not: "FREE" } }, { pendingPlan: { not: null } }],
      },
      select: {
        id: true,
        plan: true,
        billingCycleStart: true,
        pendingPlan: true,
        pendingBudgetCapCents: true,
        lastBilledOn: true,
      },
    });

    for (const ws of candidates) {
      if (ws.lastBilledOn && ws.lastBilledOn.getTime() >= today.getTime()) continue;
      try {
        await runNightlyForWorkspace(ws, today);
      } catch (err) {
        console.error(`[billing] runNightly ${ws.id}`, err);
      }
    }
  } finally {
    globalForNightly.billingNightlyRunning = false;
  }
}
