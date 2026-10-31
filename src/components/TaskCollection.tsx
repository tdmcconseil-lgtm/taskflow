"use client";

import { ButtonLink } from "@/components/Button";
import { KanbanBoard, type BoardTask } from "@/components/KanbanBoard";
import { TaskRow } from "@/components/TaskRow";
import { ReorderableSubtasks, type SubtaskItem } from "@/components/ReorderableSubtasks";
import { setTaskView } from "@/lib/actions/view";
import type { TaskNode } from "@/lib/task-tree";
import { STATUS_ORDER, formatDate, isOverdue } from "@/lib/labels";
import { useT, useLocale } from "@/lib/i18n/context";

// Présentation d'une collection de tâches (les « projets » d'un espace, ou les
// sous-tâches d'une tâche) avec bascule Liste / Tableau — comme l'ancienne page
// projet. `roots` sont les tâches de 1er niveau de cette collection.
export function TaskCollection({
  roots,
  view,
  toggleBase,
  newTaskHref,
  newTaskLabel,
  emptyLabel,
  reorderParentId,
  followedIds,
}: {
  roots: TaskNode[];
  view: "liste" | "tableau";
  toggleBase: string;
  newTaskHref?: string | null;
  newTaskLabel?: string;
  emptyLabel: string;
  // Si fourni, la vue Liste devient une liste à plat réordonnable (sous-tâches).
  reorderParentId?: string | null;
  // Identifiants des tâches auxquelles l'utilisateur est abonné (œil 👁).
  followedIds?: Set<string>;
}) {
  const t = useT();
  const locale = useLocale();
  const boardTasks: BoardTask[] = roots.map((n) => ({
    id: n.id,
    title: `${n.parentId === null ? t.task.prefixProject : t.task.prefixTask} : ${n.title}`,
    description: n.description,
    priority: n.priority,
    status: n.status,
    assignee: n.assignee,
    due: formatDate(n.dueDate, locale),
    overdue: isOverdue(n.dueDate),
    subtaskCount: n.children.length,
  }));

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1 text-sm font-medium transition ${
      active
        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
    }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          action={setTaskView}
          className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800"
        >
          <input type="hidden" name="back" value={toggleBase} />
          <button type="submit" name="view" value="tableau" className={tabClass(view === "tableau")}>
            {t.task.viewBoard}
          </button>
          <button type="submit" name="view" value="liste" className={tabClass(view === "liste")}>
            {t.task.viewList}
          </button>
        </form>
        {newTaskHref && (
          <ButtonLink href={newTaskHref} variant="primary">
            {newTaskLabel}
          </ButtonLink>
        )}
      </div>

      {roots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400 dark:border-zinc-700">
          {emptyLabel}
        </p>
      ) : view === "tableau" ? (
        <KanbanBoard tasks={boardTasks} />
      ) : reorderParentId ? (
        <ReorderableSubtasks
          parentId={reorderParentId}
          items={roots.map(
            (n): SubtaskItem => ({
              id: n.id,
              title: n.title,
              description: n.description,
              status: n.status,
              priority: n.priority,
              assignee: n.assignee,
              due: formatDate(n.dueDate, locale),
              overdue: isOverdue(n.dueDate) && n.status !== "DONE",
              childCount: n.children.length,
              attachmentCount: n.attachmentCount,
              followed: followedIds?.has(n.id) ?? false,
            }),
          )}
        />
      ) : (
        <div className="space-y-6">
          {STATUS_ORDER.map((status) => {
            const rootsOfStatus = roots.filter((n) => n.status === status);
            return (
              <section key={status} className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {t.status[status]}
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500 dark:text-zinc-400 dark:bg-zinc-800">
                    {rootsOfStatus.length}
                  </span>
                </h3>
                {rootsOfStatus.length === 0 ? (
                  <p className="px-1 text-xs italic text-zinc-400 dark:text-zinc-500">{t.task.noTasks}</p>
                ) : (
                  <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {rootsOfStatus.map((node) => (
                      <TaskRow
                        key={node.id}
                        node={node}
                        followed={followedIds?.has(node.id) ?? false}
                      />
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
