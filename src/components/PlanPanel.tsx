import { PLAN_LIMITS, formatStorageMb, type WorkspacePlan } from "@/lib/plans";
import { type SeatIssue } from "@/lib/billing/budget";
import { PlanAndBudgetForm } from "@/components/PlanAndBudgetForm";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

// Volet Formule (premier onglet de l'administration) : récapitule la formule de
// l'espace, et propose de changer OFFRE + PLAFOND en une seule opération
// (PlanAndBudgetForm). Un changement dont les membres actifs dépasseraient les
// sièges autorisés est bloqué côté serveur et renvoie ici avec un message.
export function PlanPanel({
  workspaceId,
  plan,
  budgetCapCents,
  activeMembers,
  planError,
  triedPlan,
  t,
}: {
  workspaceId: string;
  plan: WorkspacePlan;
  budgetCapCents: number | null;
  activeMembers: number;
  planError: SeatIssue | null;
  triedPlan: WorkspacePlan | null;
  t: Dictionary;
}) {
  const limits = PLAN_LIMITS[plan];
  const fmt = (n: number) => (Number.isFinite(n) ? String(n) : t.usage.unlimited);

  const rows = [
    { label: t.usage.members, value: fmt(limits.members) },
    { label: t.usage.projects, value: fmt(limits.projects) },
    { label: t.usage.storage, value: formatStorageMb(limits.storageMb) },
    { label: t.usage.pendingInvites, value: fmt(limits.pendingInvites) },
  ];

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

      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{t.usage.plan}</span>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            {plan}
          </span>
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

      {/* Offre + plafond, validés ensemble (présélection sur l'offre tentée). */}
      <PlanAndBudgetForm
        workspaceId={workspaceId}
        plan={triedPlan ?? plan}
        budgetCapCents={budgetCapCents}
        activeMembers={activeMembers}
      />
    </div>
  );
}
