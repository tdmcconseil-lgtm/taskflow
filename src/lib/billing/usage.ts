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

// Bornes du cycle de facturation en cours, pour l'estimation affichée dans
// l'administration : de la date d'ancrage du cycle jusqu'à maintenant. null si
// l'espace n'a pas de cycle payant en cours (ex. FREE) — rien à estimer.
export function currentCyclePeriod(
  billingCycleStart: Date | null,
  now: Date = new Date(),
): { start: Date; end: Date } | null {
  if (!billingCycleStart) return null;
  return { start: billingCycleStart, end: now };
}
