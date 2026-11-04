import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";
import { formatMonth } from "@/lib/labels";
import { PLANS, type WorkspacePlan } from "@/lib/plans";
import { IdeaAdminCard } from "@/components/superadmin/IdeaAdminCard";
import { setIdeaStatus, addIdeaComment, deleteIdeaComment } from "@/lib/actions/superadmin";

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
  const tab = sp.tab === "stats" ? "stats" : "idees";

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
        <TabLink href="/app/superadmin?tab=stats" active={tab === "stats"}>
          {t.superadmin.tabStats}
        </TabLink>
      </nav>

      {tab === "idees" ? (
        <IdeasAdmin locale={locale} t={t} />
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
        <StatTile label={s.statsUsersTotal} value={users.length} />
        <StatTile label={s.statsWorkspacesTotal} value={totalWorkspaces} />
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
            {months.map((m) => (
              <tr key={m.key} className="bg-white dark:bg-zinc-900">
                <td className="px-4 py-2 capitalize">{m.label}</td>
                <td className="px-4 py-2 text-right tabular-nums">{m.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
