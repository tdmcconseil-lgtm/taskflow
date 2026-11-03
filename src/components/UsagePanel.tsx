import { PLAN_DEFS, PLAN_LIMITS, formatStorageMb, type WorkspacePlan } from "@/lib/plans";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";

type Metrics = {
  members: number;
  storageBytes: number;
};

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
  const pct = unlimited || limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
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
  plan,
  metrics,
  t,
}: {
  plan: WorkspacePlan;
  metrics: Metrics;
  t: Dictionary;
}) {
  const limits = PLAN_LIMITS[plan];
  const usedMb = metrics.storageBytes / (1024 * 1024);
  const fmtLimit = (n: number) => (Number.isFinite(n) ? String(n) : t.usage.unlimited);

  // Sous-titre de la formule, même format que l'onglet Formule (mode affichage) :
  // nombre max d'utilisateurs + stockage (« par utilisateur » si offre payante).
  const planPaid = PLAN_DEFS[plan].priceCentsPerUser > 0;
  const planUsers = Number.isFinite(limits.members)
    ? t.usage.usersMax.replace("{n}", String(limits.members))
    : t.usage.usersMaxUnlimited;
  const planStorage = `${formatStorageMb(limits.storageMb)}${planPaid ? ` ${t.usage.perUser}` : ""}`;
  const planSubtitle = `${planUsers} · ${planStorage}`;
  // Capacité de stockage totale = nombre d'utilisateurs × stockage par personne
  // de l'offre actuelle. On compare le stockage effectif (documents) à ce total.
  const totalStorageMb = metrics.members * limits.storageMb;

  const gauges = [
    {
      key: "members",
      label: t.usage.members,
      used: metrics.members,
      limit: limits.members,
      display: `${metrics.members} / ${fmtLimit(limits.members)}`,
    },
    {
      key: "storage",
      label: t.usage.storage,
      used: usedMb,
      limit: totalStorageMb,
      display: `${formatStorageMb(usedMb)} / ${formatStorageMb(totalStorageMb)}`,
    },
  ];

  // Métriques proches de la limite (>= 90 %), pour l'alerte globale.
  const nearItems = gauges
    .filter((g) => Number.isFinite(g.limit) && g.used / g.limit >= 0.9)
    .map((g) => g.label);

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.usage.desc}</p>

      {/* Formule actuelle, même format que l'onglet Formule (mode affichage). */}
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {t.usage.plan}
          </span>
          <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            {plan}
          </span>
        </div>
        <p className="mt-1 pl-3 text-xs text-zinc-500 dark:text-zinc-400">{planSubtitle}</p>
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
