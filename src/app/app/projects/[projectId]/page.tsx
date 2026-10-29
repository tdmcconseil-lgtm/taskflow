import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getMembership } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { PriorityBadge } from "@/components/badges";
import { TaskControls } from "@/components/TaskControls";
import { KanbanBoard, type BoardTask } from "@/components/KanbanBoard";
import { STATUS_LABELS, STATUS_ORDER, formatDate, isOverdue } from "@/lib/labels";

export default async function ProjectPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]">) {
  const user = await requireUser();
  const { projectId } = await params;
  const sp = await searchParams;
  const view = sp.vue === "liste" ? "liste" : "tableau";

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: { select: { id: true, name: true } },
      tasks: {
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
        include: { assignee: { select: { name: true } } },
      },
    },
  });
  if (!project) notFound();

  const membership = await getMembership(user.id, project.workspaceId);
  if (!membership) notFound();

  const boardTasks: BoardTask[] = project.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    assigneeName: t.assignee?.name ?? null,
    due: formatDate(t.dueDate),
    overdue: isOverdue(t.dueDate),
  }));

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1 text-sm font-medium transition ${
      active
        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
    }`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/app/workspaces/${project.workspace.id}`}
            className="text-sm text-zinc-500 hover:underline"
          >
            ← {project.workspace.name}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="mt-1 max-w-prose text-sm text-zinc-500">{project.description}</p>
          )}
        </div>
        <Link
          href={`/app/projects/${project.id}/tasks/new`}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Nouvelle tâche
        </Link>
      </div>

      {/* Sélecteur de vue */}
      <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        <Link href={`/app/projects/${project.id}?vue=tableau`} className={tabClass(view === "tableau")}>
          Tableau
        </Link>
        <Link href={`/app/projects/${project.id}?vue=liste`} className={tabClass(view === "liste")}>
          Liste
        </Link>
      </div>

      {project.tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Aucune tâche pour l&apos;instant. Créez la première.
        </p>
      ) : view === "tableau" ? (
        <KanbanBoard tasks={boardTasks} />
      ) : (
        <div className="space-y-6">
          {STATUS_ORDER.map((status) => {
            const tasks = project.tasks.filter((t) => t.status === status);
            return (
              <section key={status} className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {STATUS_LABELS[status]}
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500 dark:bg-zinc-800">
                    {tasks.length}
                  </span>
                </h2>
                {tasks.length === 0 ? (
                  <p className="px-1 text-xs italic text-zinc-400">Aucune tâche</p>
                ) : (
                  <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 dark:bg-zinc-900"
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-medium ${
                              task.status === "DONE" ? "text-zinc-400 line-through" : ""
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="mt-0.5 line-clamp-1 text-sm text-zinc-500">
                              {task.description}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            <span>
                              {task.assignee ? `👤 ${task.assignee.name}` : "Non assignée"}
                            </span>
                            {task.dueDate && (
                              <span
                                className={
                                  isOverdue(task.dueDate) && task.status !== "DONE"
                                    ? "font-medium text-red-600 dark:text-red-400"
                                    : ""
                                }
                              >
                                📅 {formatDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={task.priority} />
                          <TaskControls taskId={task.id} status={task.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
