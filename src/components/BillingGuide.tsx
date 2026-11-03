import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import { cardClass } from "@/components/ui";

// Onglet « Mode d'emploi » de l'administration : la partie explicative du modèle
// de facturation à l'usage (plafond de budget, principes, prix…). Purement
// informatif — les éléments opérationnels (coût estimé, factures) restent dans
// l'onglet Facturation (cf. BillingInfo).
export function BillingGuide({ t }: { t: Dictionary }) {
  const b = t.billingInfo;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{b.title}</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{b.intro}</p>
      </div>

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
