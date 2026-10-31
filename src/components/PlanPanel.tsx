import { PLAN_LIMITS, PLANS, formatStorageMb, type WorkspacePlan } from "@/lib/plans";
import { setWorkspacePlan } from "@/lib/actions/admin";
import { Button } from "@/components/Button";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

// Volet Formule (premier onglet de l'administration) : récapitule la formule de
// l'espace et ce qu'elle inclut, et propose d'en changer. Le changement de
// formule ne figure plus dans le volet Consommation.
export function PlanPanel({
  workspaceId,
  plan,
  t,
}: {
  workspaceId: string;
  plan: WorkspacePlan;
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

      <form
        action={setWorkspacePlan}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
      >
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <div className="space-y-1">
          <label htmlFor="plan" className="text-sm font-medium">
            {t.usage.changePlan}
          </label>
          <select
            id="plan"
            name="plan"
            defaultValue={plan}
            className="block rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="primary" size="md" className="py-2">
          {t.usage.changePlan}
        </Button>
      </form>
    </div>
  );
}
