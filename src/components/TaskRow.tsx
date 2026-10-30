import Link from "next/link";
import { PriorityBadge } from "@/components/badges";
import { TaskControls } from "@/components/TaskControls";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate, isOverdue, prefixedTitle } from "@/lib/labels";
import type { TaskNode } from "@/lib/task-tree";

// Une ligne de tâche. On n'affiche que les tâches de même niveau : les
// sous-tâches ne sont pas dépliées ici (on indique seulement leur nombre),
// elles s'affichent sur la page de détail de la tâche.
export function TaskRow({ node, followed = false }: { node: TaskNode; followed?: boolean }) {
  return (
    <li className="bg-white dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {followed && (
              <span title="Vous êtes abonné" className="mr-1" aria-label="Abonné">
                👁
              </span>
            )}
            <Link
              href={`/app/tasks/${node.id}`}
              className={`hover:underline ${
                node.status === "DONE" ? "text-zinc-400 line-through" : ""
              }`}
            >
              {prefixedTitle(node.title, node.parentId === null)}
            </Link>
          </p>
          {node.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-zinc-500">{node.description}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {node.assignee ? (
              <span className="inline-flex items-center gap-1">
                <UserAvatar user={node.assignee} className="h-4 w-4" />
                {node.assignee.name}
              </span>
            ) : (
              <span>Non assignée</span>
            )}
            {node.dueDate && (
              <span
                className={
                  isOverdue(node.dueDate) && node.status !== "DONE"
                    ? "font-medium text-red-600 dark:text-red-400"
                    : ""
                }
              >
                📅 {formatDate(node.dueDate)}
              </span>
            )}
            {node.children.length > 0 && (
              <span className="text-zinc-400">
                {node.children.length} sous-tâche{node.children.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <PriorityBadge priority={node.priority} />
          <Link
            href={`/app/tasks/new?parent=${node.id}`}
            title="Ajouter une sous-tâche"
            className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800"
          >
            +
          </Link>
          <TaskControls taskId={node.id} status={node.status} />
        </div>
      </div>
    </li>
  );
}
