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

  const paid = PLAN_DEFS[sel].priceCentsPerUser > 0;
  const cents = euros.trim() === "" ? null : Math.round(Number(euros) * 100);
  const validAmount = cents != null && Number.isFinite(cents) && cents >= 0;
  const capMissing = paid && !validAmount;

  // Sièges max : FREE = limite de la formule ; payant = plafond / prix unitaire.
  const seats = maxSeats(sel, paid ? (validAmount ? cents : null) : null);
  const seatsLabel = Number.isFinite(seats) ? String(seats) : t.usage.unlimited;
  const over = !capMissing && activeMembers > seats;

  // Sous-titre de la formule : nombre max d'utilisateurs (limite du palier) et
  // stockage autorisé (« par utilisateur » pour les offres payantes).
  const displayPlan = editing ? sel : plan;
  const planSubtitle = (p: WorkspacePlan) => {
    const lim = PLAN_LIMITS[p];
    const paidP = PLAN_DEFS[p].priceCentsPerUser > 0;
    const users = Number.isFinite(lim.members)
      ? t.usage.usersMax.replace("{n}", String(lim.members))
      : t.usage.usersMaxUnlimited;
    const storage = `${formatStorageMb(lim.storageMb)}${paidP ? ` ${t.usage.perUser}` : ""}`;
    return `${users} · ${storage}`;
  };

  const labelCls = "text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500";
  // Le plafond n'a de sens que pour une offre payante.
  const showCap = editing ? paid : budgetCapCents != null;

  // Un seul encart : l'affichage et l'édition partagent la même disposition
  // (« Plafond mensuel de paiement », puis « Formule » avec son sous-titre). En
  // édition, le plafond devient un champ et la formule un menu, aux mêmes
  // emplacements ; le message d'erreur éventuel s'affiche tout en haut.
  return (
    <form
      action={setPlanAndBudget}
      className="space-y-5 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />

      {/* Message d'erreur éventuel, en haut de l'encart. */}
      {editing && capMissing && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          {t.usage.capRequired}
        </p>
      )}
      {editing && over && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          {t.usage.seatsOverWarning.replace("{m}", String(activeMembers)).replace("{seats}", seatsLabel)}
        </p>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-4">
          {/* Formule : libellé puis pastille/menu à la suite (même emplacement). */}
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <label htmlFor="plan" className={labelCls}>
                {t.usage.plan}
              </label>
              {editing ? (
                <select
                  id="plan"
                  name="plan"
                  value={sel}
                  onChange={(e) => setSel(e.target.value as WorkspacePlan)}
                  className="block rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {PLANS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {plan}
                </span>
              )}
            </div>
            {/* Sous-titre : utilisateurs max + stockage (suit l'offre choisie). */}
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              {planSubtitle(displayPlan)}
            </p>
          </div>

          {/* Plafond mensuel de paiement, sous l'offre : libellé puis valeur
              (champ + « € » à droite en édition). */}
          {showCap && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <label htmlFor="budgetEuros" className={labelCls}>
                {t.usage.capMonthlyLabel}
              </label>
              {editing ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <input
                    id="budgetEuros"
                    name="budgetEuros"
                    type="number"
                    min="0"
                    step="1"
                    value={euros}
                    onChange={(e) => setEuros(e.target.value)}
                    className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <span>€</span>
                </div>
              ) : (
                <p className="text-sm font-medium">{formatPrice(budgetCapCents!)}</p>
              )}
            </div>
          )}
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

      {editing && (
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
      )}
    </form>
  );
}
