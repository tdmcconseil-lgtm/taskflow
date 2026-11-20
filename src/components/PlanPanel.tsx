import { FREE_SEATS, type WorkspacePlan } from "@/lib/plans";
import { isPaidPlan, type SeatIssue } from "@/lib/billing/budget";
import { PlanAndBudgetForm } from "@/components/PlanAndBudgetForm";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

// Erreur de changement d'offre affichée dans le volet : les garde-fous de sièges
// (SeatIssue) plus le refus « offre payante seulement à partir de 6 utilisateurs ».
export type PlanError = SeatIssue | "paidPlanMinSeats";

// Volet Formule (premier onglet de l'administration) : l'encart de description
// de l'abonnement (récap + bouton « Modifier » en haut à droite) et le
// formulaire offre + plafond sont rendus par PlanAndBudgetForm. Un changement
// dont les membres actifs dépasseraient les sièges autorisés est bloqué côté
// serveur et renvoie ici avec un message (le formulaire se rouvre d'emblée).
export function PlanPanel({
  workspaceId,
  plan,
  pendingPlan,
  budgetCapCents,
  activeMembers,
  planError,
  triedPlan,
  triedBudgetEuros,
  t,
}: {
  workspaceId: string;
  plan: WorkspacePlan;
  // Offre choisie en attente du prochain traitement de nuit (null = aucune).
  pendingPlan: WorkspacePlan | null;
  budgetCapCents: number | null;
  activeMembers: number;
  planError: PlanError | null;
  triedPlan: WorkspacePlan | null;
  triedBudgetEuros: string | null;
  t: Dictionary;
}) {
  // Rétrogradation imminente : un espace PAYANT dont les utilisateurs actifs sont
  // retombés dans la franchise (≤ FREE_SEATS) et sans changement d'offre déjà en
  // attente sera repassé en Gratuit au prochain traitement de nuit (cf.
  // runNightlyForWorkspace). On prévient l'administrateur à l'avance ; la condition
  // reproduit exactement le déclencheur du traitement de nuit.
  const downgradeImminent =
    isPaidPlan(plan) && pendingPlan === null && activeMembers <= FREE_SEATS;

  return (
    <div className="space-y-6">
      {planError && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {(planError === "budgetCapUnset"
            ? t.usage.planErrorCapUnset
            : planError === "paidPlanMinSeats"
              ? t.usage.planErrorPaidMinSeats
              : t.usage.planErrorSeatLimit)
            .replace("{plan}", triedPlan ?? "")
            .replace("{n}", String(activeMembers))
            .replace("{free}", String(FREE_SEATS))
            .replace("{min}", String(FREE_SEATS + 1))}
        </div>
      )}

      {/* Rétrogradation imminente vers l'offre gratuite (équipe repassée sous la franchise). */}
      {downgradeImminent && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {t.usage.downgradeImminentNotice
            .replace("{n}", String(activeMembers))
            .replace("{free}", String(FREE_SEATS))}
        </div>
      )}

      {/* Offre en attente : un changement a été enregistré et sera appliqué la nuit. */}
      {pendingPlan && (
        <div className="rounded-xl border border-indigo-300 bg-indigo-50 p-4 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
          {t.usage.pendingPlanNotice.replace("{plan}", pendingPlan)}
        </div>
      )}

      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.usage.planRecapDesc}</p>

      <PlanAndBudgetForm
        workspaceId={workspaceId}
        plan={plan}
        triedPlan={triedPlan}
        triedBudgetEuros={triedBudgetEuros}
        budgetCapCents={budgetCapCents}
        activeMembers={activeMembers}
        defaultOpen={planError != null}
      />
    </div>
  );
}
