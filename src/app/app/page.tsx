import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/labels";
import { unarchiveWorkspace } from "@/lib/actions/workspaces";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getDictionary();
  const locale = await getLocale();

  const [workspaces, archivedWorkspaces] = await Promise.all([
    prisma.workspace.findMany({
      where: { members: { some: { userId: user.id } }, archivedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { members: true } },
        tasks: { where: { parentId: null }, select: { id: true } },
      },
    }),
    prisma.workspace.findMany({
      where: { members: { some: { userId: user.id } }, archivedAt: { not: null } },
      orderBy: { archivedAt: "desc" },
      include: {
        tasks: { where: { parentId: null }, select: { id: true } },
        members: { where: { userId: user.id }, select: { role: true } },
      },
    }),
  ]);

  // Premier pas : aucun espace (ni actif, ni archivé). On accueille la personne
  // sur son tableau de bord et on lui propose de créer son premier espace, en
  // commençant par le choix de la formule (page dédiée /workspaces/new).
  if (workspaces.length === 0 && archivedWorkspaces.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.dashboard.greeting} {user.name} 👋
        </h1>
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">{t.dashboard.welcomeTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            {t.dashboard.welcomeDesc}
          </p>
          <div className="mt-6">
            <ButtonLink href="/app/workspaces/new" variant="primary">
              {t.dashboard.createFirst}
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.dashboard.greeting} {user.name} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.dashboard.overview}</p>
      </div>

      {/* Mes espaces */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.dashboard.myWorkspaces}</h2>
          <ButtonLink href="/app/workspaces/new" variant="primary">
            {t.dashboard.newWorkspace}
          </ButtonLink>
        </div>
        {workspaces.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400 dark:border-zinc-700">
            {t.dashboard.noWorkspaces}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <Link
                key={ws.id}
                href={`/app/workspaces/${ws.id}`}
                className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700"
              >
                <p className="font-medium">{ws.name}</p>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {ws.tasks.length}{" "}
                  {ws.tasks.length > 1 ? t.dashboard.projectsWord : t.dashboard.projectWord} ·{" "}
                  {ws._count.members}{" "}
                  {ws._count.members > 1 ? t.dashboard.membersWord : t.dashboard.memberWord}
                </p>
                {/* Formule de l'espace, même pastille que le récap de l'administration. */}
                <div className="mt-auto flex justify-end pt-4">
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {ws.plan}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Espaces archivés */}
      {archivedWorkspaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-500 dark:text-zinc-400">{t.dashboard.archivedWorkspaces}</h2>
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-dashed border-zinc-300 dark:divide-zinc-800 dark:border-zinc-700">
            {archivedWorkspaces.map((ws) => {
              const isOwner = ws.members[0]?.role === "OWNER";
              return (
                <li
                  key={ws.id}
                  className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 dark:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-600 dark:text-zinc-300">
                      {ws.name}
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {t.dashboard.archivedOn} {formatDate(ws.archivedAt, locale)} · {ws.tasks.length}{" "}
                      {ws.tasks.length > 1 ? t.dashboard.projectsWord : t.dashboard.projectWord}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-2">
                      <form action={unarchiveWorkspace}>
                        <input type="hidden" name="workspaceId" value={ws.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          {t.dashboard.unarchive}
                        </button>
                      </form>
                      <Link
                        href={`/app/workspaces/${ws.id}/delete`}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/50"
                      >
                        {t.dashboard.delete}
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
