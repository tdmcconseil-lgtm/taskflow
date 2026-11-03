import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { type Locale } from "@/lib/i18n/config";
import { cardClass } from "@/components/ui";
import { formatDate, formatMonth } from "@/lib/labels";
import { formatPrice, type WorkspacePlan } from "@/lib/plans";
import { isPaidPlan, unitPriceCents } from "@/lib/billing/budget";
import { billableUsersDetailed, currentMonthPeriod } from "@/lib/billing/usage";
import { payInvoice } from "@/lib/actions/billing";

// Détail d'une facture (réservé aux administrateurs) : la liste des utilisateurs
// qui composent le montant, avec pour chacun sa dernière période prise en compte.
// invoiceId = "current" (mois en cours, montant estimé, recalculé à l'instant) ou
// l'id d'une facture mensuelle émise (montant/statut/échéance FIGÉS ; la liste des
// utilisateurs est recalculée à la demande — option A, sans snapshot).
export default async function InvoiceDetailPage({
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

  if (invoiceId === "current") {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true, billingCycleStart: true },
    });
    if (!workspace || !isPaidPlan(workspace.plan) || !workspace.billingCycleStart) notFound();
    const month = currentMonthPeriod(workspace.billingCycleStart)!;
    const users = await billableUsersDetailed(workspaceId, month.start, month.end);
    return (
      <InvoiceView
        workspaceId={workspaceId}
        v={v}
        locale={locale}
        title={v.currentCycleTitle}
        plans={[workspace.plan]}
        periodStart={month.start}
        periodEnd={month.end}
        amountCents={users.length * unitPriceCents(workspace.plan)}
        billedUsers={users.length}
        isCurrent={true}
        status={null}
        dueAt={null}
        users={users}
      />
    );
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    select: {
      periodStart: true,
      periodEnd: true,
      amountCents: true,
      status: true,
      dueAt: true,
      segments: { select: { plan: true } },
    },
  });
  if (!invoice) notFound();

  // Formules couvertes par la facture (plusieurs si changement d'offre dans le mois).
  const plans = [...new Set(invoice.segments.map((s) => s.plan))] as WorkspacePlan[];

  // Liste recalculée sur la période de la facture (le montant/statut restent ceux
  // figés à l'émission, qui font foi).
  const users = await billableUsersDetailed(workspaceId, invoice.periodStart, invoice.periodEnd);

  return (
    <InvoiceView
      workspaceId={workspaceId}
      invoiceId={invoiceId}
      v={v}
      locale={locale}
      title={`${v.invoiceTitle} · ${formatMonth(invoice.periodStart, locale)}`}
      plans={plans}
      periodStart={invoice.periodStart}
      periodEnd={invoice.periodEnd}
      amountCents={invoice.amountCents}
      billedUsers={users.length}
      isCurrent={false}
      status={invoice.status}
      dueAt={invoice.dueAt}
      users={users}
    />
  );
}

function InvoiceView({
  workspaceId,
  invoiceId,
  v,
  locale,
  title,
  plans,
  periodStart,
  periodEnd,
  amountCents,
  billedUsers,
  isCurrent,
  status,
  dueAt,
  users,
}: {
  workspaceId: string;
  invoiceId?: string;
  v: Awaited<ReturnType<typeof getDictionary>>["invoices"];
  locale: Locale;
  title: string;
  plans: WorkspacePlan[];
  periodStart: Date;
  periodEnd: Date;
  amountCents: number;
  billedUsers: number;
  isCurrent: boolean;
  status: "PENDING" | "PAID" | null;
  dueAt: Date | null;
  users: Awaited<ReturnType<typeof billableUsersDetailed>>;
}) {
  const period = isCurrent
    ? `${formatDate(periodStart, locale)} → ${v.ongoing}`
    : formatMonth(periodStart, locale);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/app/workspaces/${workspaceId}/administration`}
        className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
      >
        ← {v.backToBilling}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{period}</p>
      </div>

      <section className={`${cardClass} grid grid-cols-1 gap-4 sm:grid-cols-4`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {v.planLabel}
          </p>
          <p className="mt-1 text-sm font-medium">{plans.join(" · ") || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {isCurrent ? v.amountEstimatedLabel : v.amountLabel}
          </p>
          <p className="mt-1 text-sm font-medium">{formatPrice(amountCents)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {v.usersLabel}
          </p>
          <p className="mt-1 text-sm font-medium">{billedUsers}</p>
        </div>
        {!isCurrent && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {v.statusLabel}
            </p>
            <p className="mt-1 text-sm font-medium">
              {status === "PAID" ? v.statusPaid : v.statusPending}
              {status !== "PAID" && dueAt && (
                <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  {v.due.replace("{date}", formatDate(dueAt, locale) ?? "")}
                </span>
              )}
            </p>
          </div>
        )}
      </section>

      {isCurrent && (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {v.currentEstimateNote}
        </p>
      )}

      {/* Règlement adossé à la facture : marquer payée EST la constatation du
          paiement (pas de rapprochement manuel). Réservé aux factures émises et
          encore dues ; la page n'est accessible qu'aux administrateurs. */}
      {!isCurrent && status === "PENDING" && invoiceId && (
        <form action={payInvoice} className="flex items-center gap-3">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            {v.pay}
          </button>
        </form>
      )}

      {!isCurrent && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{v.lateFeeNotice}</p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {v.usersSectionTitle}
        </h2>
        {users.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{v.empty}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {users.map((u) => (
              <li
                key={u.userId}
                className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 dark:bg-zinc-900"
              >
                <span className={`font-medium ${u.name ? "" : "italic text-zinc-400 dark:text-zinc-500"}`}>
                  {u.name || v.anonymized}
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {formatDate(u.lastStart, locale)} → {u.lastEnd ? formatDate(u.lastEnd, locale) : v.stillActive}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
