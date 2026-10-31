import { PLAN_LIMITS, PLANS, type WorkspacePlan } from "@/lib/plans";
import { setWorkspacePlan } from "@/lib/actions/admin";
import { Button } from "@/components/Button";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

type Metrics = {
  members: number;
  projects: number;
  storageBytes: number;
  pendingInvites: number;
};

// Formate une taille en Mo : au-delà de 1024 Mo, on bascule en Go.
function fmtStorage(mb: number): string {
  if (mb >= 1024) {
    const go = mb / 1024;
    return `${Number.isInteger(go) ? go : go.toFixed(1)} Go`;
  }
  return `${Math.round(mb)} Mo`;
}

// Barre de jauge : verte < 70 %, ambre 70-90 %, rouge > 90 %. Une limite
// illimitée (Infinity) n'affiche pas de remplissage.
function Gauge({
  label,
  used,
  limit,
  display,
}: {
  label: string;
  used: number;
  limit: number;
  display: string;
}) {
  const unlimited = !Number.isFinite(limit);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const near = !unlimited && pct >= 90;
  const color = unlimited
    ? "bg-zinc-300 dark:bg-zinc-700"
    : pct > 90
      ? "bg-red-500"
      : pct >= 70
        ? "bg-amber-500"
        : "bg-green-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={near ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}>
          {display}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${unlimited ? 0 : pct}%` }} />
      </div>
    </div>
  );
}

// Volet Consommation : usage de l'espace comparé aux limites de sa formule.
export function UsagePanel({
  workspaceId,
  plan,
  metrics,
  t,
}: {
  workspaceId: string;
  plan: WorkspacePlan;
  metrics: Metrics;
  t: Dictionary;
}) {
  const limits = PLAN_LIMITS[plan];
  const usedMb = metrics.storageBytes / (1024 * 1024);
  const fmtLimit = (n: number) => (Number.isFinite(n) ? String(n) : t.usage.unlimited);

  const gauges = [
    {
      key: "members",
      label: t.usage.members,
      used: metrics.members,
      limit: limits.members,
      display: `${metrics.members} / ${fmtLimit(limits.members)}`,
    },
    {
      key: "projects",
      label: t.usage.projects,
      used: metrics.projects,
      limit: limits.projects,
      display: `${metrics.projects} / ${fmtLimit(limits.projects)}`,
    },
    {
      key: "storage",
      label: t.usage.storage,
      used: usedMb,
      limit: limits.storageMb,
      display: `${fmtStorage(usedMb)} / ${fmtStorage(limits.storageMb)}`,
    },
    {
      key: "pendingInvites",
      label: t.usage.pendingInvites,
      used: metrics.pendingInvites,
      limit: limits.pendingInvites,
      display: `${metrics.pendingInvites} / ${fmtLimit(limits.pendingInvites)}`,
    },
  ];

  // Métriques proches de la limite (>= 90 %), pour l'alerte globale.
  const nearItems = gauges
    .filter((g) => Number.isFinite(g.limit) && g.used / g.limit >= 0.9)
    .map((g) => g.label);

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.usage.desc}</p>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{t.usage.plan}</span>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            {plan}
          </span>
        </div>
        <form action={setWorkspacePlan} className="flex items-center gap-2">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <label htmlFor="plan" className="sr-only">
            {t.usage.changePlan}
          </label>
          <select
            id="plan"
            name="plan"
            defaultValue={plan}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" size="md">
            {t.usage.changePlan}
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {gauges.map((g) => (
          <Gauge key={g.key} label={g.label} used={g.used} limit={g.limit} display={g.display} />
        ))}
      </div>

      {nearItems.length > 0 && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {t.usage.nearLimit.replace("{items}", nearItems.join(", "))}
        </p>
      )}
    </div>
  );
}
