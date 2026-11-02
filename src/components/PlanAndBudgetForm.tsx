"use client";

import { useState } from "react";
import { setPlanAndBudget } from "@/lib/actions/admin";
import {
  PLANS,
  PLAN_DEFS,
  PLAN_LIMITS,
  formatPrice,
  formatStorageMb,
  type WorkspacePlan,
} from "@/lib/plans";
import { maxSeats } from "@/lib/billing/budget";
import { SubmitButton } from "@/components/SubmitButton";
import { inputClass, labelClass } from "@/components/ui";
import { useT } from "@/lib/i18n/context";

// Volet Formule : l'encart de description de l'abonnement (formule en cours + ce
// qu'elle comprend) avec, en haut à droite, le bouton « Modifier l'abonnement ».
// Au clic, le formulaire offre + plafond s'ouvre sous l'encart (ou d'emblée
// après un refus serveur à corriger). Les sièges maximum autorisés (plafond /
// prix unitaire, ou la limite de la formule pour FREE) se mettent à jour en
// direct ; si les membres actifs dépassent ces sièges, on alerte (augmenter le
// plafond) — le serveur bloque de toute façon la validation.
export function PlanAndBudgetForm({
  plan,
  triedPlan = null,
  workspaceId,
  budgetCapCents,
  activeMembers,
  defaultOpen = false,
}: {
  // Offre actuellement en vigueur (affichée dans le récapitulatif).
  plan: WorkspacePlan;
  // Offre qu'on venait de tenter (présélection du formulaire après un refus).
  triedPlan?: WorkspacePlan | null;
  workspaceId: string;
  budgetCapCents: number | null;
  activeMembers: number;
  // Ouvre d'emblée le formulaire (ex. après un refus serveur à corriger).
  defaultOpen?: boolean;
}) {
  const t = useT();
  const initialEuros = budgetCapCents == null ? "" : String(budgetCapCents / 100);
  const [editing, setEditing] = useState(defaultOpen);
  const [sel, setSel] = useState<WorkspacePlan>(triedPlan ?? plan);
  const [euros, setEuros] = useState(initialEuros);

  // Fermer = abandonner les changements, revenir aux valeurs en cours.
  const cancel = () => {
    setSel(triedPlan ?? plan);
    setEuros(initialEuros);
    setEditing(false);
  };

  const limits = PLAN_LIMITS[plan];
  const fmt = (n: number) => (Number.isFinite(n) ? String(n) : t.usage.unlimited);
  const rows = [
    { label: t.usage.members, value: fmt(limits.members) },
    { label: t.usage.projects, value: fmt(limits.projects) },
    { label: t.usage.storage, value: formatStorageMb(limits.storageMb) },
    { label: t.usage.pendingInvites, value: fmt(limits.pendingInvites) },
  ];

  const paid = PLAN_DEFS[sel].priceCentsPerUser > 0;
  const cents = euros.trim() === "" ? null : Math.round(Number(euros) * 100);
  const validAmount = cents != null && Number.isFinite(cents) && cents >= 0;
  const capMissing = paid && !validAmount;

  // Sièges max : FREE = limite de la formule ; payant = plafond / prix unitaire.
  const seats = maxSeats(sel, paid ? (validAmount ? cents : null) : null);
  const seatsLabel = Number.isFinite(seats) ? String(seats) : t.usage.unlimited;
  const over = !capMissing && activeMembers > seats;

  return (
    <div className="space-y-4">
      {/* Encart de description de l'abonnement : formule en cours + bouton. */}
      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{t.usage.plan}</span>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {plan}
            </span>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-950"
            >
              {t.usage.changePlan}
            </button>
          )}
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {t.usage.includes}
        </p>
        <ul className="mt-2 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
          {rows.map((r) => (
            <li key={r.label} className="flex justify-between gap-3 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">{r.label}</span>
              <span className="font-medium">{r.value}</span>
            </li>
          ))}
        </ul>
      </div>

      {editing && (
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

          <div className="flex items-center gap-3">
            <SubmitButton>{t.usage.applyChange}</SubmitButton>
            <button
              type="button"
              onClick={cancel}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {t.usage.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
