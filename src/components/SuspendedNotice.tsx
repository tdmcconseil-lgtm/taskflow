import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import { type Locale } from "@/lib/i18n/config";
import { formatPrice } from "@/lib/plans";
import { formatDate, formatMonth } from "@/lib/labels";
import { cardClass } from "@/components/ui";
import { payInvoice } from "@/lib/actions/billing";
import type { OverdueInvoice } from "@/lib/billing/suspension";

// Écran affiché à la place de tout l'espace quand celui-ci est suspendu (facture
// échue impayée). Pour un administrateur : la liste des factures à régler, avec un
// bouton « Payer » par facture — la seule action possible tant que la coupure dure.
// Pour un membre : un message indiquant qu'un administrateur doit régulariser.
export function SuspendedNotice({
  t,
  locale,
  workspaceId,
  isAdmin,
  invoices,
}: {
  t: Dictionary;
  locale: Locale;
  workspaceId: string;
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
                <div className="min-w-0">
                  <p className="font-medium">
                    {formatMonth(inv.periodStart, locale)} · {formatPrice(inv.amountCents)}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {s.overdueSince.replace("{date}", formatDate(inv.dueAt, locale) ?? "")}
                  </p>
                </div>
                <form action={payInvoice}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                  >
                    {s.pay}
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className={`${cardClass} text-xs text-zinc-500 dark:text-zinc-400`}>{s.payNote}</p>
        </section>
      )}
    </div>
  );
}
