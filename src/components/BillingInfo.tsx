import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import { cardClass } from "@/components/ui";
import { formatPrice, type WorkspacePlan } from "@/lib/plans";
import { isPaidPlan, unitPriceCents } from "@/lib/billing/budget";

// Onglet « Facturation » de l'administration : explique aux administrateurs le
// modèle de facturation à l'usage (utilisateur-mois) et, surtout, le plafond de
// budget qu'ils fixent eux-mêmes. Affiche en tête le coût estimé du mois en cours
// (utilisateurs facturables × prix unitaire) ; le reste est informatif — la
// facturation n'est pas encore encaissée (cf. la note en bas).
export function BillingInfo({
  t,
  plan,
  pendingPlan,
  billableUsers,
}: {
  t: Dictionary;
  plan: WorkspacePlan;
  // Offre choisie en attente du prochain traitement de nuit (null = aucune).
  pendingPlan: WorkspacePlan | null;
  // Utilisateurs facturables du cycle en cours (cf. lib/billing/usage).
  billableUsers: number;
}) {
  const b = t.billingInfo;
  const paid = isPaidPlan(plan);
  const estimate = formatPrice(billableUsers * unitPriceCents(plan));
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{b.title}</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{b.intro}</p>
      </div>

      {/* Offre en attente : rappel que le changement s'appliquera cette nuit. */}
      {pendingPlan && (
        <p className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200">
          {t.usage.pendingPlanNotice.replace("{plan}", pendingPlan)}
        </p>
      )}

      {/* Coût estimé du mois en cours, en tête (l'info la plus concrète). */}
      <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {b.estimateTitle}
        </h3>
        {paid ? (
          <>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {b.estimateAmount.replace("{amount}", estimate)}
            </p>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {b.estimateUsers.replace("{n}", String(billableUsers))}
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{b.estimateHint}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{b.estimateFree}</p>
        )}
      </section>

      {/* Le plafond de budget est le point central côté admin : mis en avant. */}
      <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
        <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">{b.budgetTitle}</h3>
        <p className="mt-2 text-sm leading-relaxed text-indigo-900/80 dark:text-indigo-200/80">
          {b.budgetBody}
        </p>
      </section>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {b.points.map((p) => (
          <li key={p.title} className={`${cardClass} space-y-1.5`}>
            <h3 className="text-sm font-semibold">{p.title}</h3>
            <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{p.body}</p>
          </li>
        ))}
      </ul>

      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {b.notActive}
      </p>
    </div>
  );
}
