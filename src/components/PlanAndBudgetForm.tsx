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
  triedBudgetEuros = null,
  workspaceId,
  budgetCapCents,
  activeMembers,
  defaultOpen = false,
}: {
  // Offre actuellement en vigueur (affichée dans le récapitulatif).
  plan: WorkspacePlan;
  // Offre qu'on venait de tenter (présélection du formulaire après un refus).
  triedPlan?: WorkspacePlan | null;
  // Montant saisi lors d'un changement refusé : le champ se rouvre dessus, pour
  // que l'alerte porte sur ce qui a été tenté (et non la valeur en base).
  triedBudgetEuros?: string | null;
  workspaceId: string;
  budgetCapCents: number | null;
  activeMembers: number;
  // Ouvre d'emblée le formulaire (ex. après un refus serveur à corriger).
  defaultOpen?: boolean;
}) {
  const t = useT();
  const dbEuros = budgetCapCents == null ? "" : String(budgetCapCents / 100);
  const [editing, setEditing] = useState(defaultOpen);
  const [sel, setSel] = useState<WorkspacePlan>(triedPlan ?? plan);
  const [euros, setEuros] = useState(triedBudgetEuros ?? dbEuros);

  // Fermer = abandonner les changements, revenir aux valeurs enregistrées.
  const cancel = () => {
    setSel(plan);
    setEuros(dbEuros);
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
  // Plafond minimal requis = membres actifs × prix unitaire de l'offre choisie.
  const minCapLabel = formatPrice(activeMembers * PLAN_DEFS[sel].priceCentsPerUser);

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

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-4">
          {/* Formule : libellé puis pastille/menu à la suite (même emplacement).
              Hauteur de ligne figée pour que le passage en édition ne décale
              rien — seule l'apparence du champ change. */}
          <div>
            <div className="flex min-h-[36px] flex-wrap items-center gap-x-3 gap-y-1">
              <label htmlFor="plan" className={labelCls}>
                {t.usage.plan}
              </label>
              {editing ? (
                <select
                  id="plan"
                  name="plan"
                  value={sel}
                  onChange={(e) => setSel(e.target.value as WorkspacePlan)}
                  className="block h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
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
            {/* Sous-titre : utilisateurs max + stockage (suit l'offre choisie),
                légèrement décalé à droite et en plus petit. */}
            <p className="mt-1 pl-3 text-xs text-zinc-500 dark:text-zinc-400">
              {planSubtitle(displayPlan)}
            </p>
          </div>

          {/* Plafond mensuel de paiement, sous l'offre : libellé puis valeur
              (champ + « € » à droite en édition). */}
          {showCap && (
            <div className="flex min-h-[36px] flex-wrap items-center gap-x-3 gap-y-1">
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
                    className="h-9 w-28 rounded-lg border border-zinc-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
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

      {/* Sous le plafond : un bloc de message toujours présent en édition
          (hauteur stable, pas de saut de page) — rouge si les paramètres sont
          incompatibles (validation bloquée), vert sinon. */}
      {editing &&
        (capMissing || over ? (
          <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            {capMissing
              ? t.usage.capRequired
              : paid
                ? t.usage.seatsOverWarning
                    .replace("{m}", String(activeMembers))
                    .replace("{min}", minCapLabel)
                : t.usage.seatsOverWarningFree
                    .replace("{m}", String(activeMembers))
                    .replace("{seats}", seatsLabel)}
          </p>
        ) : (
          <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-950/50 dark:text-green-300">
            {t.usage.seatsOk
              .replace("{m}", String(activeMembers))
              .replace("{seats}", seatsLabel)}
          </p>
        ))}

      {/* Changement d'offre (≠ offre courante) : il ne sera pas appliqué tout de
          suite mais au traitement de nuit — on le dit avant de valider. */}
      {editing && sel !== plan && (
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          {t.billing.planChangePending}
        </p>
      )}

      {editing && (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={cancel}
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {t.usage.cancel}
          </button>
          <SubmitButton disabled={capMissing || over}>{t.usage.applyChange}</SubmitButton>
        </div>
      )}
    </form>
  );
}
