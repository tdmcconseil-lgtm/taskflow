import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import { type Locale } from "@/lib/i18n/config";
import { formatDate, formatMonth } from "@/lib/labels";
import { formatPrice, type WorkspacePlan } from "@/lib/plans";
import { isPaidPlan, unitPriceCents } from "@/lib/billing/budget";
import { startCardSetup } from "@/lib/actions/stripe";

// Une facture présentée dans la liste : le mois en cours (montant estimé, pas
// encore facturé) ou une facture mensuelle émise (montant figé, statut + échéance).
export type InvoiceListItem = {
  id: string; // "current" (mois en cours) ou l'id de la facture mensuelle
  isCurrent: boolean;
  periodStart: Date; // 1er du mois
  periodEnd: Date | null; // 1er du mois suivant (null pour le mois en cours)
  amountCents: number;
  billableUsers: number | null; // uniquement pour le mois en cours
  status: "PENDING" | "PAID" | null; // null pour le mois en cours
  dueAt: Date | null;
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
  stripeEnabled,
  cardOnFile,
}: {
  t: Dictionary;
  plan: WorkspacePlan;
  // Offre choisie en attente du prochain traitement de nuit (null = aucune).
  pendingPlan: WorkspacePlan | null;
  // Utilisateurs facturables du mois en cours (cf. lib/billing/usage).
  billableUsers: number;
  workspaceId: string;
  // Factures (mois en cours + factures mensuelles émises) ; chacune ouvre son détail.
  invoices: InvoiceListItem[];
  locale: Locale;
  // Encaissement Stripe configuré (clé ou mock) : affiche le bloc moyen de paiement.
  stripeEnabled: boolean;
  // Une carte est enregistrée pour cet espace (Workspace.stripeDefaultPaymentMethodId).
  cardOnFile: boolean;
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

      {/* Moyen de paiement : carte enregistrée via Stripe (offres payantes). Le
          débit réel passe par Stripe ; aucun bouton « payé » côté app. */}
      {paid && stripeEnabled && (
        <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {b.paymentTitle}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {cardOnFile ? b.paymentCardOnFile : b.paymentNoCard}
          </p>
          <form action={startCardSetup} className="mt-3">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <button
              type="submit"
              className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              {cardOnFile ? b.paymentUpdate : b.paymentAdd}
            </button>
          </form>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{b.paymentHint}</p>
        </section>
      )}

      {/* Factures : mois en cours (montant estimé) + factures mensuelles émises.
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
                      {inv.isCurrent ? v.currentCycleRow : formatMonth(inv.periodStart, locale)}
                      {inv.isCurrent ? (
                        <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-normal text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {v.ongoing}
                        </span>
                      ) : (
                        (() => {
                          const overdue =
                            inv.status === "PENDING" && inv.dueAt !== null && inv.dueAt.getTime() < Date.now();
                          const cls =
                            inv.status === "PAID"
                              ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300"
                              : overdue
                                ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300";
                          const label =
                            inv.status === "PAID" ? v.statusPaid : overdue ? v.statusOverdue : v.statusPending;
                          return (
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-normal ${cls}`}>
                              {label}
                            </span>
                          );
                        })()
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {inv.isCurrent
                        ? v.usersCount.replace("{n}", String(inv.billableUsers ?? 0))
                        : inv.dueAt
                          ? v.due.replace("{date}", formatDate(inv.dueAt, locale) ?? "")
                          : null}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {inv.isCurrent
                      ? v.estimatedAmount.replace("{amount}", formatPrice(inv.amountCents))
                      : formatPrice(inv.amountCents)}
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
