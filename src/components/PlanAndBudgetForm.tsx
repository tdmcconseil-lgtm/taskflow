"use client";

import { useState } from "react";
import { setPlanAndBudget } from "@/lib/actions/admin";
import { PLANS, PLAN_DEFS, formatPrice, type WorkspacePlan } from "@/lib/plans";
import { maxSeats } from "@/lib/billing/budget";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass } from "@/components/ui";
import { useT } from "@/lib/i18n/context";

// Offre + plafond dans un seul formulaire, validés en une opération. Le nombre
// de sièges maximum autorisés (plafond / prix unitaire, ou la limite de la
// formule pour FREE) se met à jour en direct selon l'offre et le montant. Si les
// membres actifs dépassent ces sièges, on alerte (augmenter le plafond, ou
// annuler) ; le serveur bloque de toute façon la validation.
export function PlanAndBudgetForm({
  plan,
  workspaceId,
  budgetCapCents,
  activeMembers,
}: {
  // Offre présélectionnée (l'offre en cours, ou celle qu'on venait de tenter).
  plan: WorkspacePlan;
  workspaceId: string;
  budgetCapCents: number | null;
  activeMembers: number;
}) {
  const t = useT();
  const [sel, setSel] = useState<WorkspacePlan>(plan);
  const [euros, setEuros] = useState(budgetCapCents == null ? "" : String(budgetCapCents / 100));

  const paid = PLAN_DEFS[sel].priceCentsPerUser > 0;
  const cents = euros.trim() === "" ? null : Math.round(Number(euros) * 100);
  const validAmount = cents != null && Number.isFinite(cents) && cents >= 0;
  const capMissing = paid && !validAmount;

  // Sièges max : FREE = limite de la formule ; payant = plafond / prix unitaire.
  const seats = maxSeats(sel, paid ? (validAmount ? cents : null) : null);
  const seatsLabel = Number.isFinite(seats) ? String(seats) : t.usage.unlimited;
  const over = !capMissing && activeMembers > seats;

  return (
    <form
      action={setPlanAndBudget}
      className="space-y-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <label htmlFor="plan" className={labelClass}>
            {t.usage.plan}
          </label>
          <select
            id="plan"
            name="plan"
            value={sel}
            onChange={(e) => setSel(e.target.value as WorkspacePlan)}
            className="block rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {paid && (
          <div className="space-y-1">
            <label htmlFor="budgetEuros" className={labelClass}>
              {t.budgetCap.label}
            </label>
            <input
              id="budgetEuros"
              name="budgetEuros"
              type="number"
              min="0"
              step="1"
              value={euros}
              onChange={(e) => setEuros(e.target.value)}
              className={`${inputClass} w-40`}
            />
          </div>
        )}
      </div>

      {/* Sièges max autorisés + membres actuels, en direct. */}
      <div className="text-sm">
        <p className="text-zinc-600 dark:text-zinc-300">
          {t.usage.maxSeatsLive.replace("{seats}", capMissing ? "—" : seatsLabel)}
          {paid && validAmount && (
            <span className="text-zinc-400 dark:text-zinc-500">
              {" · "}
              {t.budgetCap.unitNote.replace("{price}", formatPrice(PLAN_DEFS[sel].priceCentsPerUser))}
            </span>
          )}
        </p>
        <p className="text-zinc-500 dark:text-zinc-400">
          {t.usage.currentMembersLive.replace("{n}", String(activeMembers))}
        </p>
      </div>

      {capMissing && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          {t.usage.capRequired}
        </p>
      )}
      {over && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          {t.usage.seatsOverWarning.replace("{m}", String(activeMembers)).replace("{seats}", seatsLabel)}
        </p>
      )}

      <SubmitButton>{t.usage.changePlan}</SubmitButton>
    </form>
  );
}
