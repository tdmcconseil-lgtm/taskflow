import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import { type Locale } from "@/lib/i18n/config";
import { formatPrice } from "@/lib/plans";
import { formatDate, formatMonth } from "@/lib/labels";
import type { OverdueInvoice } from "@/lib/billing/suspension";

// Écran affiché à la place de tout l'espace quand celui-ci est suspendu (coupure
// administrative pour facture échue impayée). AUCUN paiement en self-service :
//   - administrateur → explication + liste (lecture seule) des factures échues à
//     régler par virement ; l'accès sera rétabli une fois le paiement constaté par
//     le superadmin (scripts/recouvrement.ts) ;
//   - membre → message indiquant qu'un administrateur doit régulariser.
export function SuspendedNotice({
  t,
  locale,
  isAdmin,
  invoices,
}: {
  t: Dictionary;
  locale: Locale;
  isAdmin: boolean;
  invoices: OverdueInvoice[];
}) {
  const s = t.suspended;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl border border-red-300 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
        <h1 className="text-xl font-semibold tracking-tight text-red-900 dark:text-red-200">
          {s.title}
        </h1>
        <p className="mt-2 text-sm text-red-900/80 dark:text-red-200/80">
          {isAdmin ? s.adminLead : s.memberLead}
        </p>
      </div>

      {isAdmin && invoices.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {s.invoicesTitle}
          </h2>
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 dark:bg-zinc-900"
              >
                <span className="font-medium">{formatMonth(inv.periodStart, locale)}</span>
                <span className="text-sm">
                  <span className="font-medium">{formatPrice(inv.amountCents)}</span>
                  <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                    {s.overdueSince.replace("{date}", formatDate(inv.dueAt, locale) ?? "")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
