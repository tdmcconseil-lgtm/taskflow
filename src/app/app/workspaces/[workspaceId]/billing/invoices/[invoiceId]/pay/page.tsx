import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { cardClass } from "@/components/ui";
import { Button } from "@/components/Button";
import { formatMonth } from "@/lib/labels";
import { formatPrice } from "@/lib/plans";
import { payInvoice } from "@/lib/actions/billing";

// Page de paiement d'une facture (réservée aux administrateurs). Page d'action
// dédiée : on arrive ici depuis le détail d'une facture PENDING, on confirme, et
// l'action payInvoice renvoie au détail (qui montre alors « Payée »).
//
// ÉTAT ACTUEL = DÉMO : le paiement est simulé (cf. src/lib/actions/billing.ts),
// d'où le bandeau d'avertissement. Le vrai encaissement Stripe se branchera sur
// cette même page/action.
export default async function PayInvoicePage({
  params,
}: {
  params: Promise<{ workspaceId: string; invoiceId: string }>;
}) {
  const user = await requireUser();
  const { workspaceId, invoiceId } = await params;
  const t = await getDictionary();
  const locale = await getLocale();
  const v = t.invoices;

  const membership = await getMembership(user.id, workspaceId);
  if (!membership) notFound();
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") notFound();

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    select: { periodStart: true, amountCents: true, status: true },
  });
  if (!invoice) notFound();

  const detail = `/app/workspaces/${workspaceId}/billing/invoices/${invoiceId}`;
  // Rien à payer si elle n'est pas en attente : retour au détail.
  if (invoice.status !== "PENDING") redirect(detail);

  const amount = formatPrice(invoice.amountCents);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href={detail} className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">
        ← {v.backToBilling}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{v.payPageTitle}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {formatMonth(invoice.periodStart, locale)}
        </p>
      </div>

      {/* Bandeau démonstration : tant que Stripe n'est pas branché, ce paiement est simulé. */}
      <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        {v.paySimulation}
      </p>

      <div className={`${cardClass} space-y-4`}>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{v.amountLabel}</span>
          <span className="text-2xl font-semibold tracking-tight">{amount}</span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{v.payIntro}</p>
        <form action={payInvoice} className="flex items-center gap-3">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <Button type="submit" variant="primary">
            {v.payConfirm.replace("{amount}", amount)}
          </Button>
          <Link href={detail} className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">
            {v.payCancel}
          </Link>
        </form>
      </div>
    </div>
  );
}
