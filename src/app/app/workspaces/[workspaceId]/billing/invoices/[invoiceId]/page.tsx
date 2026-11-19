import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { type Locale } from "@/lib/i18n/config";
import { cardClass } from "@/components/ui";
import { ButtonLink } from "@/components/Button";
import { formatDate, formatMonth } from "@/lib/labels";
import { formatPrice, billableSeats, FREE_SEATS, type WorkspacePlan } from "@/lib/plans";
import { isPaidPlan, unitPriceCents } from "@/lib/billing/budget";
import { billableUsersDetailed, currentMonthPeriod } from "@/lib/billing/usage";

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
    // Franchise FREE_SEATS : seuls les utilisateurs actifs au-delà du seuil sont
    // facturés. La liste ci-dessous reste exhaustive (tous les actifs) ; le montant
    // et le compte « facturés » retranchent la franchise.
    const billed = billableSeats(users.length);
    return (
      <InvoiceView
        workspaceId={workspaceId}
        invoiceId={null}
        v={v}
        locale={locale}
        title={v.currentCycleTitle}
        plans={[workspace.plan]}
        periodStart={month.start}
        periodEnd={month.end}
        amountCents={billed * unitPriceCents(workspace.plan)}
        billedUsers={billed}
        activeUsers={users.length}
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
      billedUsers={billableSeats(users.length)}
      activeUsers={users.length}
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
  activeUsers,
  isCurrent,
  status,
  dueAt,
  users,
}: {
  workspaceId: string;
  // id de la facture émise, ou null pour le mois en cours (non payable).
  invoiceId: string | null;
  v: Awaited<ReturnType<typeof getDictionary>>["invoices"];
  locale: Locale;
  title: string;
  plans: WorkspacePlan[];
  periodStart: Date;
  periodEnd: Date;
  amountCents: number;
  // Sièges facturés (franchise FREE_SEATS retranchée) et utilisateurs actifs
  // (liste exhaustive) : les deux peuvent différer (ex. 10 actifs → 5 facturés).
  billedUsers: number;
  activeUsers: number;
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

      {/* Facture en attente : paiement in-app (bouton → page de paiement dédiée). */}
      {!isCurrent && status === "PENDING" && invoiceId && (
        <div>
          <ButtonLink
            href={`/app/workspaces/${workspaceId}/billing/invoices/${invoiceId}/pay`}
            variant="primary"
          >
            {v.pay}
          </ButtonLink>
        </div>
      )}

      {!isCurrent && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{v.lateFeeNotice}</p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {v.usersSectionTitle}
        </h2>
        {/* Franchise : les cinq premiers utilisateurs sont gratuits. On rappelle,
            quand la liste dépasse ce seuil, combien sont inclus et combien facturés. */}
        {activeUsers > 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {v.franchiseNote
              .replace("{free}", String(Math.min(activeUsers, FREE_SEATS)))
              .replace("{billed}", String(billedUsers))
              .replace("{active}", String(activeUsers))}
          </p>
        )}
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
