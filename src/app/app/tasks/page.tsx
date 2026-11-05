import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { formatDate, isOverdue } from "@/lib/labels";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.pageTitles.tasks} — getRIDA` };
}

// Page dédiée « Mes tâches à faire » (comme Discussions et Événements). Liste
// les tâches assignées à l'utilisateur et non terminées, toutes espaces
// confondus, triées par échéance. Déplacée depuis l'accueil.
export default async function TasksPage() {
  const user = await requireUser();
  const t = await getDictionary();
  const locale = await getLocale();

  const myTasks = await prisma.task.findMany({
    where: { assigneeId: user.id, status: { not: "DONE" } },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    include: { workspace: { select: { id: true, name: true } } },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.dashboard.myTasks}</h1>
      </div>

      {myTasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400 dark:border-zinc-700">
          {t.dashboard.noMyTasks}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {myTasks.map((task) => (
            <li key={task.id} className="bg-white px-4 py-2.5 dark:bg-zinc-900">
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
                    className="text-xs text-zinc-500 dark:text-zinc-400 hover:underline"
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
                          : "text-zinc-500 dark:text-zinc-400"
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
    </div>
  );
}
