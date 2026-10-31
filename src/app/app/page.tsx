import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { formatDate, isOverdue } from "@/lib/labels";
import { unarchiveWorkspace } from "@/lib/actions/workspaces";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getDictionary();
  const locale = await getLocale();

  const [myTasks, workspaces, archivedWorkspaces] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: user.id, status: { not: "DONE" } },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: { workspace: { select: { id: true, name: true } } },
      take: 50,
    }),
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

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.dashboard.greeting} {user.name} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-300">{t.dashboard.overview}</p>
      </div>

      {/* Mes tâches */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t.dashboard.myTasks}</h2>
        {myTasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:text-zinc-300 dark:border-zinc-700">
            {t.dashboard.noMyTasks}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {myTasks.map((task) => (
              <li key={task.id} className="bg-white p-4 dark:bg-zinc-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/app/tasks/${task.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {task.title}
                    </Link>
                    <Link
                      href={`/app/workspaces/${task.workspace.id}`}
                      className="text-xs text-zinc-500 dark:text-zinc-300 hover:underline"
                    >
                      {task.workspace.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.dueDate && (
                      <span
                        className={`text-xs ${
                          isOverdue(task.dueDate)
                            ? "font-medium text-red-600 dark:text-red-400"
                            : "text-zinc-500 dark:text-zinc-300"
                        }`}
                      >
                        {formatDate(task.dueDate, locale)}
                      </span>
                    )}
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mes espaces */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.dashboard.myWorkspaces}</h2>
          <ButtonLink href="/app/workspaces/new" variant="primary">
            {t.dashboard.newWorkspace}
          </ButtonLink>
        </div>
        {workspaces.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:text-zinc-300 dark:border-zinc-700">
            {t.dashboard.noWorkspaces}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <Link
                key={ws.id}
                href={`/app/workspaces/${ws.id}`}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700"
              >
                <p className="font-medium">{ws.name}</p>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-300">
                  {ws.tasks.length}{" "}
                  {ws.tasks.length > 1 ? t.dashboard.projectsWord : t.dashboard.projectWord} ·{" "}
                  {ws._count.members}{" "}
                  {ws._count.members > 1 ? t.dashboard.membersWord : t.dashboard.memberWord}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Espaces archivés */}
      {archivedWorkspaces.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-500 dark:text-zinc-300">{t.dashboard.archivedWorkspaces}</h2>
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
                    <p className="text-xs text-zinc-400 dark:text-zinc-300">
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
