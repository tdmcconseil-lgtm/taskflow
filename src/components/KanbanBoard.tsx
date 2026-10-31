"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PriorityBadge } from "@/components/badges";
import { TypeIcon } from "@/components/TypeIcon";
import { UserAvatar } from "@/components/UserAvatar";
import type { AssigneeInfo } from "@/lib/task-tree";
import { STATUS_ORDER } from "@/lib/labels";
import { useT } from "@/lib/i18n/context";
import { setTaskStatus } from "@/lib/actions/tasks";
import type { TaskStatus, TaskPriority } from "@/generated/prisma/client";

export type BoardTask = {
  id: string;
  title: string;
  isProject: boolean;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignee: AssigneeInfo | null;
  due: string | null;
  overdue: boolean;
  subtaskCount: number;
};

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  TODO: "border-t-zinc-300 dark:border-t-zinc-600",
  IN_PROGRESS: "border-t-blue-400",
  DONE: "border-t-green-400",
};

export function KanbanBoard({ tasks: initial }: { tasks: BoardTask[] }) {
  const t = useT();
  const [tasks, setTasks] = useState<BoardTask[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function moveTask(taskId: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;

    const previousStatus = task.status;
    setError(null);
    // Mise à jour optimiste : la carte bouge immédiatement.
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));

    startTransition(async () => {
      const fd = new FormData();
      fd.set("taskId", taskId);
      fd.set("status", status);
      let result;
      try {
        result = await setTaskStatus(undefined, fd);
      } catch {
        result = { error: "Une erreur est survenue." };
      }
      // Refus (ex. sous-tâches non terminées) : on annule le déplacement.
      if (result?.error) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t)),
        );
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Fermer"
            className="text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STATUS_ORDER.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(status);
            }}
            onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              setOverCol(null);
              setDragId(null);
              if (id) moveTask(id, status);
            }}
            className={`flex flex-col rounded-xl border border-t-4 border-zinc-200 bg-zinc-100/60 p-3 transition dark:border-zinc-800 dark:bg-zinc-900/40 ${
              COLUMN_ACCENT[status]
            } ${overCol === status ? "ring-2 ring-indigo-400" : ""}`}
          >
            <div className="mb-3 flex items-center gap-2 px-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t.status[status]}
              </h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-zinc-500 dark:text-zinc-400 dark:bg-zinc-800">
                {columnTasks.length}
              </span>
            </div>

            <div className="flex min-h-24 flex-1 flex-col gap-2">
              {columnTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/app/tasks/${task.id}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", task.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragId(task.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverCol(null);
                  }}
                  className={`block cursor-pointer rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-indigo-300 active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-indigo-700 ${
                    dragId === task.id ? "opacity-50" : ""
                  }`}
                >
                  <p
                    className={`flex items-center gap-1.5 text-sm font-medium ${
                      status === "DONE" ? "text-zinc-400 dark:text-zinc-500 line-through" : ""
                    }`}
                  >
                    <TypeIcon
                      isProject={task.isProject}
                      label={task.isProject ? t.task.prefixProject : t.task.prefixTask}
                    />
                    <span className="truncate">{task.title}</span>
                  </p>
                  {task.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {task.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <PriorityBadge priority={task.priority} />
                    {task.subtaskCount > 0 && (
                      <span title={t.taskTabs.subtasks}>↳ {task.subtaskCount}</span>
                    )}
                    {task.assignee && (
                      <span className="inline-flex items-center gap-1">
                        <UserAvatar user={task.assignee} className="h-4 w-4" />
                        {task.assignee.name}
                      </span>
                    )}
                    {task.due && (
                      <span
                        className={
                          task.overdue && status !== "DONE"
                            ? "font-medium text-red-600 dark:text-red-400"
                            : ""
                        }
                      >
                        📅 {task.due}
                      </span>
                    )}
                  </div>
                </Link>
              ))}

              {columnTasks.length === 0 && (
                <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-center text-xs italic text-zinc-400 dark:text-zinc-500 dark:border-zinc-700">
                  {t.task.dropHere}
                </p>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
