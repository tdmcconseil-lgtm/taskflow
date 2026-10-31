"use client";

import Link from "next/link";
import { PriorityBadge } from "@/components/badges";
import { TypeIcon } from "@/components/TypeIcon";
import { TaskControls } from "@/components/TaskControls";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate, isOverdue } from "@/lib/labels";
import { useT, useLocale } from "@/lib/i18n/context";
import type { TaskNode } from "@/lib/task-tree";

// Une ligne de tâche. On n'affiche que les tâches de même niveau : les
// sous-tâches ne sont pas dépliées ici (on indique seulement leur nombre),
// elles s'affichent sur la page de détail de la tâche.
export function TaskRow({ node, followed = false }: { node: TaskNode; followed?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const isProject = node.parentId === null;
  return (
    <li className="bg-white dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <TypeIcon isProject={isProject} label={isProject ? t.task.prefixProject : t.task.prefixTask} />
            <Link
              href={`/app/tasks/${node.id}`}
              className={`truncate font-medium hover:underline ${
                node.status === "DONE" ? "text-zinc-400 dark:text-zinc-500 line-through" : ""
              }`}
            >
              {node.title}
            </Link>
            {followed && (
              <span className="shrink-0" title={t.task.subscribed} aria-label={t.task.subscribed}>
                👁
              </span>
            )}
          </div>
          {node.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-zinc-500 dark:text-zinc-400">{node.description}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            {node.assignee ? (
              <span className="inline-flex items-center gap-1">
                <UserAvatar user={node.assignee} className="h-4 w-4" />
                {node.assignee.name}
              </span>
            ) : (
              <span>{t.task.unassigned}</span>
            )}
            {node.dueDate && (
              <span
                className={
                  isOverdue(node.dueDate) && node.status !== "DONE"
                    ? "font-medium text-red-600 dark:text-red-400"
                    : ""
                }
              >
                📅 {formatDate(node.dueDate, locale)}
              </span>
            )}
            {node.children.length > 0 && (
              <span className="text-zinc-400 dark:text-zinc-500">
                {node.children.length}{" "}
                {node.children.length > 1 ? t.task.subtasksWord : t.task.subtaskWord}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <PriorityBadge priority={node.priority} />
          <Link
            href={`/app/tasks/new?parent=${node.id}`}
            title={t.task.addSubtask}
            className="rounded-md px-2 py-1 text-sm text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800"
          >
            +
          </Link>
          <TaskControls taskId={node.id} status={node.status} />
        </div>
      </div>
    </li>
  );
}
