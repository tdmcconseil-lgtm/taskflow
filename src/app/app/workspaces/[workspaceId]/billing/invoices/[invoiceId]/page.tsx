import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { type Locale } from "@/lib/i18n/config";
import { cardClass } from "@/components/ui";
import { formatDate } from "@/lib/labels";
import { formatPrice, type WorkspacePlan } from "@/lib/plans";
import { isPaidPlan, unitPriceCents } from "@/lib/billing/budget";
import { billableUsersDetailed } from "@/lib/billing/usage";

// Détail d'une facture (réservé aux administrateurs) : la liste des utilisateurs
// qui composent le montant, avec pour chacun sa dernière période prise en compte.
// invoiceId = "current" (cycle en cours, montant estimé, recalculé à l'instant)
// ou l'id d'un BillingSegment passé (montant/nombre FIGÉS à la clôture ; la liste
// des utilisateurs est recalculée à la demande — option A, sans snapshot).
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

  // Données de la facture : soit le cycle en cours, soit un segment clôturé.
  let plan: WorkspacePlan;
  let periodStart: Date;
  let periodEnd: Date;
  let amountCents: number;
  let billedUsers: number;
  let isCurrent: boolean;

  if (invoiceId === "current") {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true, billingCycleStart: true },
    });
    if (!workspace || !isPaidPlan(workspace.plan) || !workspace.billingCycleStart) notFound();
    plan = workspace.plan;
    periodStart = workspace.billingCycleStart;
    periodEnd = new Date();
    isCurrent = true;
    const users = await billableUsersDetailed(workspaceId, periodStart, periodEnd);
    billedUsers = users.length;
    // Estimation à l'instant présent (montant arrêté à la clôture).
    amountCents = users.length * unitPriceCents(plan);
    return (
      <InvoiceView
        workspaceId={workspaceId}
        v={v}
        locale={locale}
        plan={plan}
        periodStart={periodStart}
        periodEnd={periodEnd}
        amountCents={amountCents}
        billedUsers={billedUsers}
        isCurrent={isCurrent}
        users={users}
      />
    );
  }

  const segment = await prisma.billingSegment.findFirst({
    where: { id: invoiceId, workspaceId },
    select: {
      plan: true,
      startedAt: true,
      endedAt: true,
      amountCents: true,
      billableUsers: true,
    },
  });
  if (!segment) notFound();
  plan = segment.plan;
  periodStart = segment.startedAt;
  periodEnd = segment.endedAt;
  amountCents = segment.amountCents;
  billedUsers = segment.billableUsers;
  isCurrent = false;

  // Liste recalculée sur la période du segment (le montant/nombre restent ceux
  // figés à la clôture, qui font foi).
  const users = await billableUsersDetailed(workspaceId, periodStart, periodEnd);

  return (
    <InvoiceView
      workspaceId={workspaceId}
      v={v}
      locale={locale}
      plan={plan}
      periodStart={periodStart}
      periodEnd={periodEnd}
      amountCents={amountCents}
      billedUsers={billedUsers}
      isCurrent={isCurrent}
      users={users}
    />
  );
}

function InvoiceView({
  workspaceId,
  v,
  locale,
  plan,
  periodStart,
  periodEnd,
  amountCents,
  billedUsers,
  isCurrent,
  users,
}: {
  workspaceId: string;
  v: Awaited<ReturnType<typeof getDictionary>>["invoices"];
  locale: Locale;
  plan: WorkspacePlan;
  periodStart: Date;
  periodEnd: Date;
  amountCents: number;
  billedUsers: number;
  isCurrent: boolean;
  users: Awaited<ReturnType<typeof billableUsersDetailed>>;
}) {
  const period = `${formatDate(periodStart, locale)} → ${
    isCurrent ? v.ongoing : formatDate(periodEnd, locale)
  }`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/app/workspaces/${workspaceId}/administration`}
        className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
      >
        ← {v.backToBilling}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isCurrent ? v.currentCycleTitle : v.invoiceTitle}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{period}</p>
      </div>

      <section className={`${cardClass} grid grid-cols-1 gap-4 sm:grid-cols-3`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {v.planLabel}
          </p>
          <p className="mt-1 text-sm font-medium">{plan}</p>
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
      </section>

      {isCurrent && (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {v.currentEstimateNote}
        </p>
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
