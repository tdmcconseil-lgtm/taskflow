// Facturation à l'usage au MOIS CIVIL (révision validée : remplace le cycle ancré
// sur la date d'abonnement).
//
// La période de facturation est le mois calendaire (1er → dernier jour) : UNE
// facture par mois (modèle Invoice), à l'usage, terme échu. Le détail interne
// reste porté par les BillingSegment (comptabilité interne, append-only) : la
// facture mensuelle présentée et encaissée est leur AGRÉGAT.
//
// Deux choses ferment un segment :
//   - un changement d'offre effectif (constaté au traitement de nuit) → prorata
//     base 30 sur les jours du segment (seul cas qui demande un calcul) ;
//   - un passage de mois civil → clôture du segment courant au 1er du mois, puis
//     émission de la facture mensuelle qui agrège les segments du mois écoulé.
//
// Un changement d'offre n'est JAMAIS appliqué tout de suite : il est mis en
// attente (Workspace.pendingPlan) et devient effectif au « traitement de nuit »,
// seule chose qui fait avancer l'état de facturation (cf. runNightly). Le champ
// Workspace.billingCycleStart porte désormais le DÉBUT DU SEGMENT COURANT (remis
// au 1er du mois à chaque passage de mois).
//
// Les fonctions de calcul (prorata, dayCount, monthStart, planNightly) sont pures
// et testables sans base ; l'exécution (comptage des utilisateurs, écriture des
// segments, émission des factures) est isolée dans runNightlyForWorkspace.

import { prisma } from "@/lib/prisma";
import { isPaidPlan, unitPriceCents } from "@/lib/billing/budget";
import { billableUserCount } from "@/lib/billing/usage";
import type { WorkspacePlan } from "@/lib/plans";

const DAY_MS = 24 * 60 * 60 * 1000;
// Échéance d'une facture mensuelle : 30 jours après la fin du mois facturé.
const INVOICE_DUE_DAYS = 30;

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

// Premier jour (minuit UTC) du mois civil de `d`. Les dates de facturation sont
// des minuits UTC (cf. billingDay), donc le calcul de mois se fait en UTC.
export function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

// Premier jour (minuit UTC) du mois civil SUIVANT celui de `d`.
export function nextMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

export type BillingState = {
  plan: WorkspacePlan;
  // Début du segment courant (null = pas de segment payant en cours, ex. FREE).
  segmentStart: Date | null;
  pendingPlan: WorkspacePlan | null;
};

// Un segment à clôturer (facture interne à produire).
export type SegmentToClose = { plan: WorkspacePlan; start: Date; end: Date };

export type NightlyPlan = {
  // Segments clôturés par ce traitement (0, 1, ou plusieurs si plusieurs passages
  // de mois rattrapés après une interruption du job, ou un changement + un mois).
  segments: SegmentToClose[];
  nextPlan: WorkspacePlan;
  nextSegmentStart: Date | null;
  // true = l'offre a changé → appliquer aussi le plafond en attente.
  planChanged: boolean;
};

// Décide, de façon PURE, quels segments le traitement de nuit doit clôturer pour
// un espace à la date `today` (minuit du jour facturé). Reproduit l'algorithme de
// la spec « mois civil » :
//   1. passages de mois civil sur l'offre courante → un segment par mois atteint
//      (rattrapage si le job n'a pas tourné pendant plusieurs mois) ;
//   2. puis un éventuel changement d'offre en attente, effectif aujourd'hui :
//      clôture du segment payant quitté (le cas échéant) + bascule.
// L'émission des factures mensuelles (agrégat des segments) est faite ensuite,
// en base, par runNightlyForWorkspace. Un choix en attente égal à l'offre
// courante (aller-retour) est un non-événement.
export function planNightly(state: BillingState, today: Date): NightlyPlan {
  let curPlan = state.plan;
  let segStart = state.segmentStart;
  const segments: SegmentToClose[] = [];
  let planChanged = false;

  // 1) Passages de mois civil sur l'offre courante : clôture à chaque 1er atteint.
  if (isPaidPlan(curPlan) && segStart) {
    let boundary = nextMonthStart(segStart);
    while (today.getTime() >= boundary.getTime()) {
      segments.push({ plan: curPlan, start: segStart, end: boundary });
      segStart = boundary;
      boundary = nextMonthStart(boundary);
    }
  }

  // 2) Changement d'offre en attente, effectif aujourd'hui (après les clôtures de
  //    mois, qui sont chronologiquement antérieures).
  const target = state.pendingPlan ?? curPlan;
  if (state.pendingPlan && target !== curPlan) {
    if (isPaidPlan(curPlan) && segStart && segStart.getTime() < today.getTime()) {
      segments.push({ plan: curPlan, start: segStart, end: today });
    }
    curPlan = target;
    segStart = isPaidPlan(target) ? today : null;
    planChanged = true;
  }

  return { segments, nextPlan: curPlan, nextSegmentStart: segStart, planChanged };
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
// transaction :
//   - écrit les segments clôturés (montant proraté, utilisateurs facturés sur la
//     période du segment) ;
//   - met à jour l'état de facturation et vide le choix en attente ;
//   - émet les factures mensuelles des mois civils TERMINÉS qui ont des segments
//     non encore facturés (agrégat des segments du mois).
// Idempotent : les segments déjà rattachés à une facture (invoiceId non null)
// sont ignorés, et une facture par (espace, mois) est garantie par la contrainte
// d'unicité. Renvoie le nombre de factures mensuelles émises.
export async function runNightlyForWorkspace(
  ws: WorkspaceBilling,
  today: Date,
): Promise<number> {
  const plan = planNightly(
    { plan: ws.plan, segmentStart: ws.billingCycleStart, pendingPlan: ws.pendingPlan },
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

  let invoicesEmitted = 0;
  await prisma.$transaction(async (tx) => {
    if (rows.length > 0) await tx.billingSegment.createMany({ data: rows });
    await tx.workspace.update({
      where: { id: ws.id },
      data: {
        plan: plan.nextPlan,
        billingCycleStart: plan.nextSegmentStart,
        // Le plafond en attente n'est appliqué qu'au changement d'offre effectif.
        ...(plan.planChanged ? { budgetCapCents: ws.pendingBudgetCapCents } : {}),
        pendingPlan: null,
        pendingBudgetCapCents: null,
        lastBilledOn: today,
      },
    });

    // Facturation mensuelle : regrouper les segments non encore facturés par mois
    // civil d'appartenance, et émettre une facture par mois TERMINÉ.
    const unbilled = await tx.billingSegment.findMany({
      where: { workspaceId: ws.id, invoiceId: null },
      select: { id: true, endedAt: true, amountCents: true },
    });

    type MonthGroup = { periodStart: Date; periodEnd: Date; segIds: string[]; amount: number };
    const byMonth = new Map<number, MonthGroup>();
    for (const s of unbilled) {
      // Mois d'appartenance = mois de l'instant JUSTE AVANT la clôture : une
      // clôture intra-mois (changement) reste dans son mois ; une clôture au 1er
      // du mois suivant (fin de mois) est rattachée au mois qui s'achève.
      const belong = monthStart(new Date(s.endedAt.getTime() - 1));
      const key = belong.getTime();
      const g: MonthGroup =
        byMonth.get(key) ?? {
          periodStart: belong,
          periodEnd: nextMonthStart(belong),
          segIds: [],
          amount: 0,
        };
      g.segIds.push(s.id);
      g.amount += s.amountCents;
      byMonth.set(key, g);
    }

    for (const g of byMonth.values()) {
      // N'émettre que pour un mois civil terminé (son dernier segment est clos).
      if (today.getTime() < g.periodEnd.getTime()) continue;
      const invoice = await tx.invoice.create({
        data: {
          workspaceId: ws.id,
          periodStart: g.periodStart,
          periodEnd: g.periodEnd,
          amountCents: g.amount,
          dueAt: new Date(g.periodEnd.getTime() + INVOICE_DUE_DAYS * DAY_MS),
        },
      });
      await tx.billingSegment.updateMany({
        where: { id: { in: g.segIds } },
        data: { invoiceId: invoice.id },
      });
      invoicesEmitted++;
    }
  });

  return invoicesEmitted;
}

// Parties du jour civil (dans le fuseau donné) servant à décider si le traitement
// de nuit est dû et à ancrer les dates de segment (minuit UTC du jour facturé).
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

// Minuit UTC du jour civil `now` dans le fuseau `tz` (sert d'ancre de segment).
export function billingDay(now: Date, tz: string): Date {
  const { y, m, d } = tzParts(now, tz);
  return new Date(Date.UTC(y, m - 1, d));
}

// Jour de facturation courant dans le fuseau configuré (défaut Europe/Paris).
// Sert à estampiller une mise en attente pour garantir qu'un changement demandé
// aujourd'hui ne sera appliqué qu'au traitement de nuit SUIVANT (« cette nuit »),
// jamais le jour même (cf. lastBilledOn).
export function currentBillingDay(now: Date = new Date()): Date {
  return billingDay(now, process.env.BILLING_TZ ?? "Europe/Paris");
}

const globalForNightly = globalThis as unknown as { billingNightlyRunning?: boolean };

// Traitement de nuit (quotidien) : pour chaque espace sur offre payante, avec un
// choix en attente, ou avec des segments non encore facturés, applique
// l'algorithme si l'espace n'a pas déjà été traité aujourd'hui (garde-fou
// lastBilledOn). Idempotent : réexécuté le même jour, il ne refait rien. Heure et
// fuseau configurables (BILLING_NIGHTLY_HOUR, BILLING_TZ) ; défaut 03h00 Europe/Paris.
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
    // Les espaces dont la mise en attente date d'aujourd'hui portent
    // lastBilledOn = aujourd'hui (estampille posée à la demande) : ils sont donc
    // ignorés ce jour et traités au passage de nuit suivant. Les espaces passés à
    // FREE mais avec un segment non facturé restent éligibles (pour émettre leur
    // dernière facture mensuelle).
    const candidates = await prisma.workspace.findMany({
      where: {
        OR: [
          { plan: { not: "FREE" } },
          { pendingPlan: { not: null } },
          { billingSegments: { some: { invoiceId: null } } },
        ],
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
