import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";
import { formatMonth, formatDate } from "@/lib/labels";
import { PLANS, type WorkspacePlan } from "@/lib/plans";
import { IdeaAdminCard } from "@/components/superadmin/IdeaAdminCard";
import { RecoveryCard } from "@/components/superadmin/RecoveryCard";
import {
  setIdeaStatus,
  addIdeaComment,
  deleteIdeaComment,
  markInvoicePaid,
  reopenWorkspace,
} from "@/lib/actions/superadmin";

export const metadata: Metadata = { title: "Administration — getRIDA" };

// Noms de marque des formules (neutres quelle que soit la langue).
const PLAN_NAMES: Record<WorkspacePlan, string> = {
  FREE: "Free",
  PRO: "Pro",
  BUSINESS: "Business",
};

// Console superadmin (gardée par requireSuperAdmin → 404 sinon). Deux onglets via
// l'URL : « idees » (pilotage des idées) et « stats » (statistiques plateforme).
export default async function SuperadminPage({ searchParams }: PageProps<"/app/superadmin">) {
  await requireSuperAdmin();
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const sp = await searchParams;
  const tab =
    sp.tab === "stats" ? "stats" : sp.tab === "recouvrement" ? "recouvrement" : "idees";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.superadmin.title}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.superadmin.desc}</p>
      </div>

      <nav className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <TabLink href="/app/superadmin" active={tab === "idees"}>
          {t.superadmin.tabIdeas}
        </TabLink>
        <TabLink href="/app/superadmin?tab=recouvrement" active={tab === "recouvrement"}>
          {t.superadmin.tabRecovery}
        </TabLink>
        <TabLink href="/app/superadmin?tab=stats" active={tab === "stats"}>
          {t.superadmin.tabStats}
        </TabLink>
      </nav>

      {tab === "idees" ? (
        <IdeasAdmin locale={locale} t={t} />
      ) : tab === "recouvrement" ? (
        <RecoveryAdmin locale={locale} t={t} />
      ) : sp.list === "users" ? (
        <UsersList
          locale={locale}
          t={t}
          month={typeof sp.month === "string" ? sp.month : undefined}
        />
      ) : sp.list === "workspaces" ? (
        <WorkspacesList locale={locale} t={t} />
      ) : (
        <StatsPanel locale={locale} t={t} />
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
          : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      }`}
    >
      {children}
    </Link>
  );
}

type Dict = Awaited<ReturnType<typeof getDictionary>>;

// --- Onglet Idées ---
async function IdeasAdmin({ locale, t }: { locale: Locale; t: Dict }) {
  const ideas = await prisma.idea.findMany({
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      body: true,
      pseudo: true,
      status: true,
      _count: { select: { votes: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, createdAt: true },
      },
    },
  });

  if (ideas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {t.superadmin.ideasEmpty}
      </p>
    );
  }

  const labels = {
    by: t.ideas.by,
    votesLabel: t.superadmin.votesLabel,
    statusHeading: t.superadmin.statusHeading,
    status: t.ideas.status,
    responsesHeading: t.superadmin.responsesHeading,
    noResponses: t.superadmin.noResponses,
    responsePlaceholder: t.superadmin.responsePlaceholder,
    addResponse: t.superadmin.addResponse,
    deleteResponse: t.superadmin.deleteResponse,
    deleteResponseConfirm: t.superadmin.deleteResponseConfirm,
  };

  return (
    <ul className="space-y-4">
      {ideas.map((i) => (
        <IdeaAdminCard
          key={i.id}
          locale={locale}
          labels={labels}
          setStatus={setIdeaStatus}
          addResponse={addIdeaComment}
          deleteResponse={deleteIdeaComment}
          idea={{
            id: i.id,
            title: i.title,
            body: i.body,
            pseudo: i.pseudo,
            votes: i._count.votes,
            status: i.status,
            responses: i.comments.map((c) => ({
              id: c.id,
              body: c.body,
              createdAt: c.createdAt.toISOString(),
            })),
          }}
        />
      ))}
    </ul>
  );
}

// --- Onglet Recouvrement ---
// Espaces suspendus OU avec une facture échue impayée (même périmètre que le
// script scripts/recouvrement.ts). Deux actions par espace : « Marquer payé »
// (par facture) et, pour un espace suspendu, « Rouvrir sans paiement » (motif
// obligatoire). Chaque action est journalisée (RecoveryAction).
async function RecoveryAdmin({ locale, t }: { locale: Locale; t: Dict }) {
  const now = new Date();
  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { suspendedAt: { not: null } },
        { invoices: { some: { status: "PENDING", dueAt: { lt: now } } } },
      ],
    },
    orderBy: [{ suspendedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      suspendedAt: true,
      invoices: {
        where: { status: "PENDING" },
        orderBy: { periodStart: "asc" },
        select: { id: true, periodStart: true, amountCents: true, dueAt: true },
      },
    },
  });

  if (workspaces.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {t.superadmin.recoveryEmpty}
      </p>
    );
  }

  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });

  const labels = {
    suspendedSince: t.superadmin.suspendedSince,
    active: t.superadmin.recoveryActive,
    invoicesHeading: t.superadmin.unpaidInvoices,
    noInvoices: t.superadmin.noUnpaidInvoices,
    overdue: t.superadmin.overdue,
    due: t.superadmin.dueAt,
    markPaid: t.superadmin.markPaid,
    markPaidConfirm: t.superadmin.markPaidConfirm,
    reopenHeading: t.superadmin.reopenHeading,
    reasonPlaceholder: t.superadmin.reopenReasonPlaceholder,
    reopenSubmit: t.superadmin.reopenSubmit,
    reopenConfirm: t.superadmin.reopenConfirm,
  };

  return (
    <ul className="space-y-4">
      {workspaces.map((w) => (
        <RecoveryCard
          key={w.id}
          markPaid={markInvoicePaid}
          reopen={reopenWorkspace}
          labels={labels}
          workspace={{
            id: w.id,
            name: w.name,
            suspended: w.suspendedAt !== null,
            suspendedSince: w.suspendedAt ? formatDate(w.suspendedAt, locale) : null,
            invoices: w.invoices.map((inv) => ({
              id: inv.id,
              period: formatMonth(inv.periodStart, locale),
              amount: money.format(inv.amountCents / 100),
              due: formatDate(inv.dueAt, locale) ?? "",
              overdue: inv.dueAt.getTime() < now.getTime(),
            })),
          }}
        />
      ))}
    </ul>
  );
}

// --- Onglet Statistiques ---
async function StatsPanel({ locale, t }: { locale: Locale; t: Dict }) {
  const s = t.superadmin;

  const [users, totalWorkspaces, byPlan] = await Promise.all([
    prisma.user.findMany({ select: { createdAt: true } }),
    prisma.workspace.count({ where: { archivedAt: null } }),
    prisma.workspace.groupBy({
      by: ["plan"],
      where: { archivedAt: null },
      _count: true,
    }),
  ]);

  // Créations par mois (12 derniers mois, bornes UTC pour coller à formatMonth).
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, k) => {
    const i = 11 - k;
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return { key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, label: formatMonth(d, locale), count: 0 };
  });
  const idx = new Map(months.map((m, i) => [m.key, i]));
  for (const u of users) {
    const d = u.createdAt;
    const i = idx.get(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
    if (i !== undefined) months[i].count++;
  }

  const planCounts = new Map(byPlan.map((row) => [row.plan, row._count]));

  return (
    <div className="space-y-8">
      {/* Totaux */}
      <div className="grid grid-cols-2 gap-4">
        <StatTile
          label={s.statsUsersTotal}
          value={users.length}
          href="/app/superadmin?tab=stats&list=users"
        />
        <StatTile
          label={s.statsWorkspacesTotal}
          value={totalWorkspaces}
          href="/app/superadmin?tab=stats&list=workspaces"
        />
      </div>

      {/* Espaces par formule */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {s.statsWorkspacesByPlan}
        </h2>
        <table className="w-full overflow-hidden rounded-xl border border-zinc-200 text-sm dark:border-zinc-800">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">{s.statsPlanCol}</th>
              <th className="px-4 py-2 text-right font-medium">{s.statsCountCol}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {PLANS.map((plan) => (
              <tr key={plan} className="bg-white dark:bg-zinc-900">
                <td className="px-4 py-2">{PLAN_NAMES[plan]}</td>
                <td className="px-4 py-2 text-right tabular-nums">{planCounts.get(plan) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Créations d'utilisateurs par mois */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {s.statsUsersPerMonth}
        </h2>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{s.statsUsersPerMonthNote}</p>
        <table className="w-full overflow-hidden rounded-xl border border-zinc-200 text-sm dark:border-zinc-800">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">{s.statsMonthCol}</th>
              <th className="px-4 py-2 text-right font-medium">{s.statsCountCol}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {months.map((m) => {
              const href = `/app/superadmin?tab=stats&list=users&month=${m.key}`;
              return (
                <tr
                  key={m.key}
                  className="bg-white transition hover:bg-indigo-50/40 dark:bg-zinc-900 dark:hover:bg-indigo-950/30"
                >
                  <td className="px-4 py-2">
                    <Link href={href} className="block capitalize hover:underline">
                      {m.label}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <Link href={href} className="block hover:underline">
                      {m.count}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// Lien de retour vers la vue d'ensemble des statistiques, en tête d'un détail.
function DetailBack({ label }: { label: string }) {
  return (
    <Link
      href="/app/superadmin?tab=stats"
      className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
    >
      {label}
    </Link>
  );
}

// --- Détail : utilisateurs (tri par inscription décroissante) ---
// Tout l'historique si `month` est absent, sinon les seuls inscrits du mois
// donné (clé « AAAA-M », mois 0-indexé en UTC, cohérente avec la vue mensuelle).
async function UsersList({ locale, t, month }: { locale: Locale; t: Dict; month?: string }) {
  const s = t.superadmin;

  let where = {};
  let title = s.usersListTitle;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    if (Number.isFinite(y) && Number.isFinite(m)) {
      const start = new Date(Date.UTC(y, m, 1));
      const end = new Date(Date.UTC(y, m + 1, 1));
      where = { createdAt: { gte: start, lt: end } };
      title = s.usersListMonthTitle.replace("{month}", formatMonth(start, locale));
    }
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return (
    <div className="space-y-4">
      <DetailBack label={s.detailBack} />
      <h2 className="text-lg font-semibold tracking-tight">
        {title} <span className="text-sm font-normal text-zinc-400">({users.length})</span>
      </h2>
      {users.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {s.detailEmpty}
        </p>
      ) : (
        <table className="w-full overflow-hidden rounded-xl border border-zinc-200 text-sm dark:border-zinc-800">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">{s.colName}</th>
              <th className="px-4 py-2 font-medium">{s.colEmail}</th>
              <th className="px-4 py-2 text-right font-medium">{s.colRegistered}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {users.map((u) => (
              <tr key={u.id} className="bg-white dark:bg-zinc-900">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{u.email}</td>
                <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">
                  {formatDate(u.createdAt, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// --- Détail : espaces de travail (tri par création décroissante) ---
async function WorkspacesList({ locale, t }: { locale: Locale; t: Dict }) {
  const s = t.superadmin;

  const workspaces = await prisma.workspace.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      plan: true,
      createdAt: true,
      // Membres actifs (comptés sur la relation filtrée).
      members: { where: { deactivatedAt: null }, select: { id: true } },
    },
  });

  return (
    <div className="space-y-4">
      <DetailBack label={s.detailBack} />
      <h2 className="text-lg font-semibold tracking-tight">
        {s.statsWorkspacesTotal}{" "}
        <span className="text-sm font-normal text-zinc-400">({workspaces.length})</span>
      </h2>
      {workspaces.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {s.detailEmpty}
        </p>
      ) : (
        <table className="w-full overflow-hidden rounded-xl border border-zinc-200 text-sm dark:border-zinc-800">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">{s.colName}</th>
              <th className="px-4 py-2 font-medium">{s.statsPlanCol}</th>
              <th className="px-4 py-2 text-right font-medium">{s.colMembers}</th>
              <th className="px-4 py-2 text-right font-medium">{s.colCreated}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {workspaces.map((w) => (
              <tr key={w.id} className="bg-white dark:bg-zinc-900">
                <td className="px-4 py-2">{w.name}</td>
                <td className="px-4 py-2">{PLAN_NAMES[w.plan]}</td>
                <td className="px-4 py-2 text-right tabular-nums">{w.members.length}</td>
                <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">
                  {formatDate(w.createdAt, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Tuile de statistique. Avec `href`, elle devient cliquable (vers le détail) et
// montre un chevron ; la valeur elle-même est soulignée au survol.
function StatTile({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        {href && <span className="ml-1 text-base font-normal text-zinc-400">›</span>}
      </p>
    </>
  );
  if (!href) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {body}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/30"
    >
      {body}
    </Link>
  );
}
