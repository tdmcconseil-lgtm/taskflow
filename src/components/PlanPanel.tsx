import { type WorkspacePlan } from "@/lib/plans";
import { type SeatIssue } from "@/lib/billing/budget";
import { PlanAndBudgetForm } from "@/components/PlanAndBudgetForm";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

// Volet Formule (premier onglet de l'administration) : l'encart de description
// de l'abonnement (récap + bouton « Modifier » en haut à droite) et le
// formulaire offre + plafond sont rendus par PlanAndBudgetForm. Un changement
// dont les membres actifs dépasseraient les sièges autorisés est bloqué côté
// serveur et renvoie ici avec un message (le formulaire se rouvre d'emblée).
export function PlanPanel({
  workspaceId,
  plan,
  budgetCapCents,
  activeMembers,
  planError,
  triedPlan,
  triedBudgetEuros,
  t,
}: {
  workspaceId: string;
  plan: WorkspacePlan;
  budgetCapCents: number | null;
  activeMembers: number;
  planError: SeatIssue | null;
  triedPlan: WorkspacePlan | null;
  triedBudgetEuros: string | null;
  t: Dictionary;
}) {
  return (
    <div className="space-y-6">
      {planError && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {(planError === "budgetCapUnset" ? t.usage.planErrorCapUnset : t.usage.planErrorSeatLimit)
            .replace("{plan}", triedPlan ?? "")
            .replace("{n}", String(activeMembers))}
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
