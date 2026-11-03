import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import { type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/labels";
import { formatPrice, type WorkspacePlan } from "@/lib/plans";
import { isPaidPlan, unitPriceCents } from "@/lib/billing/budget";

// Une facture présentée dans la liste : cycle en cours (montant estimé) ou
// segment clôturé (montant figé). endedAt null = cycle en cours.
export type InvoiceListItem = {
  id: string;
  plan: WorkspacePlan;
  startedAt: Date;
  endedAt: Date | null;
  amountCents: number;
  billableUsers: number;
  isCurrent: boolean;
};

// Onglet « Facturation » de l'administration : la partie OPÉRATIONNELLE — l'offre
// en attente éventuelle, le coût estimé du cycle en cours et la liste des factures
// (cycle en cours + segments clôturés). Les explications du modèle sont dans
// l'onglet « Mode d'emploi » (cf. BillingGuide).
export function BillingInfo({
  t,
  plan,
  pendingPlan,
  billableUsers,
  workspaceId,
  invoices,
  locale,
}: {
  t: Dictionary;
  plan: WorkspacePlan;
  // Offre choisie en attente du prochain traitement de nuit (null = aucune).
  pendingPlan: WorkspacePlan | null;
  // Utilisateurs facturables du cycle en cours (cf. lib/billing/usage).
  billableUsers: number;
  workspaceId: string;
  // Factures (cycle en cours + segments clôturés) ; chacune ouvre son détail.
  invoices: InvoiceListItem[];
  locale: Locale;
}) {
  const b = t.billingInfo;
  const v = t.invoices;
  const paid = isPaidPlan(plan);
  const estimate = formatPrice(billableUsers * unitPriceCents(plan));
  return (
    <div className="space-y-6">
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

      {/* Factures : cycle en cours (montant estimé) + segments clôturés.
          Chaque ligne ouvre le détail des utilisateurs qui composent le montant. */}
      {invoices.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {v.listTitle}
          </h3>
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/app/workspaces/${workspaceId}/billing/invoices/${inv.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 transition hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {inv.isCurrent ? v.currentCycleRow : `${formatPrice(inv.amountCents)} · ${inv.plan}`}
                      {inv.isCurrent && (
                        <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-normal text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {v.ongoing}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(inv.startedAt, locale)} →{" "}
                      {inv.endedAt ? formatDate(inv.endedAt, locale) : v.ongoing} ·{" "}
                      {v.usersCount.replace("{n}", String(inv.billableUsers))}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {inv.isCurrent ? v.estimatedAmount.replace("{amount}", formatPrice(inv.amountCents)) : v.viewDetail}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
