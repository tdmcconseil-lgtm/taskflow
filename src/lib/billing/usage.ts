// Calcul de l'usage facturable « utilisateur-mois » à partir du journal
// d'appartenance (MembershipEvent, cf. prisma/schema). Règle retenue : toute
// personne active ne serait-ce qu'un instant dans la période compte pour une
// unité, au prix plein (pas de prorata) ; un même utilisateur ne compte qu'une
// fois. On reconstitue les intervalles d'activité de chaque membre depuis le
// journal et on teste le chevauchement avec la période.

import { prisma } from "@/lib/prisma";

type Ev = { type: "ACTIVATED" | "DEACTIVATED"; at: Date };

// Vrai si l'utilisateur a été actif à un instant quelconque de [start, end),
// d'après la suite chronologique de ses événements. Un intervalle fermé
// [activé, désactivé) ne compte que s'il se termine APRÈS le début de la période
// (désactivation pile au début = non facturé) ; un intervalle encore ouvert
// signifie « actif maintenant », donc toujours dans la période.
export function activeInPeriod(events: Ev[], start: Date, end: Date): boolean {
  const startMs = start.getTime();
  let openAt: Date | null = null;
  for (const e of events) {
    if (e.type === "ACTIVATED") {
      if (openAt === null) openAt = e.at;
    } else if (openAt !== null) {
      if (e.at.getTime() > startMs) return true;
      openAt = null;
    }
  }
  return openAt !== null;
}

// Nombre d'utilisateurs distincts facturables sur [start, end) pour un espace.
export async function billableUserCount(
  workspaceId: string,
  start: Date,
  end: Date,
): Promise<number> {
  const events = await prisma.membershipEvent.findMany({
    where: { workspaceId, at: { lt: end } },
    orderBy: { at: "asc" },
    select: { userId: true, type: true, at: true },
  });

  const byUser = new Map<string, Ev[]>();
  for (const e of events) {
    const arr = byUser.get(e.userId);
    if (arr) arr.push({ type: e.type, at: e.at });
    else byUser.set(e.userId, [{ type: e.type, at: e.at }]);
  }

  let count = 0;
  for (const evs of byUser.values()) {
    if (activeInPeriod(evs, start, end)) count++;
  }
  return count;
}

// Reconstitue les intervalles d'activité [début, fin) d'un membre depuis sa
// suite chronologique d'événements. Un intervalle encore ouvert (actif
// maintenant) a une fin null.
function intervals(events: Ev[]): { start: Date; end: Date | null }[] {
  const out: { start: Date; end: Date | null }[] = [];
  let openAt: Date | null = null;
  for (const e of events) {
    if (e.type === "ACTIVATED") {
      if (openAt === null) openAt = e.at;
    } else if (openAt !== null) {
      out.push({ start: openAt, end: e.at });
      openAt = null;
    }
  }
  if (openAt !== null) out.push({ start: openAt, end: null });
  return out;
}

// Détail d'un utilisateur facturable sur une période.
export type BillableUserDetail = {
  userId: string;
  // Nom affiché (vrais noms, écran réservé aux admins) ; "" si le compte a été
  // anonymisé (RGPD) — le détail reste exact en nombre et en montant.
  name: string;
  // Dernière période d'activité prise en compte sur [start, end) : son début, et
  // sa fin (null = encore actif à la clôture).
  lastStart: Date;
  lastEnd: Date | null;
};

// Liste détaillée des utilisateurs facturables sur [start, end) : même ensemble
// (et donc même nombre) que billableUserCount, enrichi du nom et de la dernière
// période prise en compte. Recalcul à la demande (option A, sans snapshot) : le
// journal MembershipEvent est append-only et l'anonymisation RGPD n'efface pas
// l'enregistrement, donc le recalcul reste fiable pour toute facture passée.
export async function billableUsersDetailed(
  workspaceId: string,
  start: Date,
  end: Date,
): Promise<BillableUserDetail[]> {
  const events = await prisma.membershipEvent.findMany({
    where: { workspaceId, at: { lt: end } },
    orderBy: { at: "asc" },
    select: { userId: true, type: true, at: true, user: { select: { name: true } } },
  });

  const byUser = new Map<string, { name: string; evs: Ev[] }>();
  for (const e of events) {
    const cur = byUser.get(e.userId);
    if (cur) cur.evs.push({ type: e.type, at: e.at });
    else byUser.set(e.userId, { name: e.user.name, evs: [{ type: e.type, at: e.at }] });
  }

  const out: BillableUserDetail[] = [];
  for (const [userId, { name, evs }] of byUser) {
    if (!activeInPeriod(evs, start, end)) continue;
    const ivs = intervals(evs);
    // La dernière période chronologique est toujours celle qui compte (les
    // intervalles sont ordonnés ; dès qu'un intervalle chevauche la période, le
    // dernier la chevauche aussi).
    const last = ivs[ivs.length - 1];
    out.push({ userId, name, lastStart: last.start, lastEnd: last.end });
  }
  out.sort((a, b) => a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId));
  return out;
}

// Bornes du mois de facturation en cours, pour l'estimation affichée dans
// l'administration : du début du segment courant (1er du mois, ou jour de
// souscription en cours de mois) jusqu'à maintenant. null si l'espace n'a pas de
// segment payant en cours (ex. FREE) — rien à estimer.
export function currentMonthPeriod(
  segmentStart: Date | null,
  now: Date = new Date(),
): { start: Date; end: Date } | null {
  if (!segmentStart) return null;
  return { start: segmentStart, end: now };
}
