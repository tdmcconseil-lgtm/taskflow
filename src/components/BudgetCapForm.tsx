"use client";

import { setBudgetCap } from "@/lib/actions/admin";
import { useT } from "@/lib/i18n/context";
import { inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { isPaidPlan, unitPriceCents, maxSeats } from "@/lib/billing/budget";
import { formatPrice, type WorkspacePlan } from "@/lib/plans";

// Plafond de budget mensuel (offres payantes). L'admin saisit un montant ; le
// nombre de sièges autorisés = montant / prix unitaire. Tant qu'il n'est pas
// défini, aucun membre ne peut être ajouté (garde-fou côté serveur).
export function BudgetCapForm({
  workspaceId,
  plan,
  budgetCapCents,
  activeMembers,
}: {
  workspaceId: string;
  plan: WorkspacePlan;
  budgetCapCents: number | null;
  activeMembers: number;
}) {
  const t = useT();
  const b = t.budgetCap;

  // Le plafond ne concerne que les offres payantes (Free = sièges bornés par la
  // formule, sans plafond de budget).
  if (!isPaidPlan(plan)) return null;

  const unit = unitPriceCents(plan);
  const seats = budgetCapCents == null ? 0 : maxSeats(plan, budgetCapCents);
  const currentEuros = budgetCapCents == null ? "" : String(budgetCapCents / 100);

  return (
    <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
      <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">{b.title}</h3>
      <p className="mt-2 text-sm text-indigo-900/80 dark:text-indigo-200/80">{b.hint}</p>

      {budgetCapCents == null ? (
        <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          {b.unsetWarning}
        </p>
      ) : (
        <p className="mt-3 text-sm text-indigo-900/80 dark:text-indigo-200/80">
          {b.current.replace("{amount}", formatPrice(budgetCapCents)).replace("{seats}", String(seats))}
          {" · "}
          {b.active.replace("{n}", String(activeMembers))}
        </p>
      )}

      <form action={setBudgetCap} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <div className="space-y-1">
          <label htmlFor="budgetEuros" className={labelClass}>
            {b.label}
          </label>
          <input
            id="budgetEuros"
            name="budgetEuros"
            type="number"
            min="0"
            step="1"
            defaultValue={currentEuros}
            className={`${inputClass} w-40`}
          />
        </div>
        <SubmitButton>{b.save}</SubmitButton>
      </form>

      <p className="mt-2 text-xs text-indigo-900/60 dark:text-indigo-200/60">
        {b.unitNote.replace("{price}", formatPrice(unit))}
      </p>
    </section>
  );
}
