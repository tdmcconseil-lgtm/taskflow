// Outil de simulation LOCAL de la facturation (dev uniquement, non importé par
// l'app). Permet de « faire avancer le temps » sans attendre : on rejoue le
// traitement de nuit à une date simulée, et on peut reculer la date d'ancrage
// d'un cycle pour rendre des renouvellements dus.
//
// Usage (depuis la racine du projet, base locale) :
//   npx tsx scripts/simuler-facturation.ts list
//       → état de facturation de chaque espace + nombre de factures (segments)
//   npx tsx scripts/simuler-facturation.ts set-anchor <workspaceId> <YYYY-MM-DD>
//       → fixe billingCycleStart (et vide lastBilledOn) pour un espace payant
//   npx tsx scripts/simuler-facturation.ts run <YYYY-MM-DD> [workspaceId]
//       → rejoue le traitement de nuit À CETTE DATE (clôt les cycles dus, applique
//         une offre en attente) pour tous les espaces concernés, ou un seul
//   npx tsx scripts/simuler-facturation.ts segments <workspaceId>
//       → liste les factures (segments) émises pour un espace
//
// Exemple : passer un espace en PRO via l'UI (plafond), puis
//   set-anchor <id> 2026-09-01   (cycle démarré il y a ~2 mois)
//   run 2026-11-05 <id>          (émet les renouvellements dus → 2 factures)
//   → visibles dans l'onglet Facturation.

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { runNightlyForWorkspace } from "@/lib/billing/cycle";

function parseDay(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`Date attendue YYYY-MM-DD, reçu : ${s}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}
const day = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "—");
const euros = (c: number) => `${(c / 100).toFixed(2)} €`;

async function list() {
  const wss = await prisma.workspace.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      plan: true,
      billingCycleStart: true,
      pendingPlan: true,
      lastBilledOn: true,
      _count: { select: { billingSegments: true } },
    },
  });
  for (const w of wss) {
    console.log(
      `${w.id}  ${w.plan.padEnd(8)} cycle=${day(w.billingCycleStart)} pending=${
        w.pendingPlan ?? "—"
      } lastBilled=${day(w.lastBilledOn)} factures=${w._count.billingSegments}  « ${w.name} »`,
    );
  }
}

async function segments(workspaceId: string) {
  const segs = await prisma.billingSegment.findMany({
    where: { workspaceId },
    orderBy: { endedAt: "asc" },
  });
  if (segs.length === 0) return console.log("Aucune facture pour cet espace.");
  for (const s of segs) {
    console.log(
      `${day(s.startedAt)} → ${day(s.endedAt)}  ${s.plan.padEnd(8)} ${s.days}j  ${
        s.billableUsers
      } util.  ${euros(s.amountCents)}`,
    );
  }
}

async function setAnchor(workspaceId: string, dateStr: string) {
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { billingCycleStart: parseDay(dateStr), lastBilledOn: null },
  });
  console.log(`Ancre du cycle fixée au ${dateStr} pour ${workspaceId}.`);
}

async function run(dateStr: string, workspaceId?: string) {
  const today = parseDay(dateStr);
  const wss = await prisma.workspace.findMany({
    where: workspaceId
      ? { id: workspaceId }
      : { OR: [{ plan: { not: "FREE" } }, { pendingPlan: { not: null } }] },
    select: {
      id: true,
      name: true,
      plan: true,
      billingCycleStart: true,
      pendingPlan: true,
      pendingBudgetCapCents: true,
    },
  });
  console.log(`— Traitement de nuit simulé au ${dateStr} —`);
  for (const ws of wss) {
    const n = await runNightlyForWorkspace(ws, today);
    console.log(`  « ${ws.name} » : ${n} facture(s) émise(s)`);
  }
}

async function main() {
  const [cmd, a, b] = process.argv.slice(2);
  switch (cmd) {
    case "list":
      await list();
      break;
    case "segments":
      if (!a) throw new Error("workspaceId requis");
      await segments(a);
      break;
    case "set-anchor":
      if (!a || !b) throw new Error("usage: set-anchor <workspaceId> <YYYY-MM-DD>");
      await setAnchor(a, b);
      break;
    case "run":
      if (!a) throw new Error("usage: run <YYYY-MM-DD> [workspaceId]");
      await run(a, b);
      break;
    default:
      console.log("Commandes : list | segments <id> | set-anchor <id> <date> | run <date> [id]");
  }
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
